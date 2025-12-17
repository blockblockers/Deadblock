// useDragAndDrop.js - Custom hook for drag-and-drop piece placement
// Handles both touch (mobile) and mouse (desktop) interactions
// Resolves scroll conflict by using movement threshold detection

import { useState, useCallback, useRef, useEffect } from 'react';
import { getPieceCoords, canPlacePiece, BOARD_SIZE } from '../utils/gameLogic';
import { soundManager } from '../utils/soundManager';

// Configuration
const DRAG_THRESHOLD = 10; // pixels moved before drag starts
const LONG_PRESS_DELAY = 150; // ms hold before drag from board
const SCROLL_ANGLE_THRESHOLD = 60; // degrees - if movement is more vertical than this, it's scroll

/**
 * Custom hook for drag-and-drop piece placement
 * 
 * @param {Object} options
 * @param {Array} options.board - Current board state
 * @param {Array} options.usedPieces - Already used pieces
 * @param {Function} options.onPieceSelect - Called when piece is selected
 * @param {Function} options.onPendingMove - Called to set pending move position
 * @param {Function} options.onDrop - Called when piece is dropped on valid position
 * @param {number} options.rotation - Current rotation
 * @param {boolean} options.flipped - Current flip state
 * @param {boolean} options.disabled - Disable all drag operations
 */
export const useDragAndDrop = ({
  board,
  usedPieces = [],
  onPieceSelect,
  onPendingMove,
  onDrop,
  rotation = 0,
  flipped = false,
  disabled = false,
}) => {
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [draggedPiece, setDraggedPiece] = useState(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [previewCell, setPreviewCell] = useState(null);
  const [isValidDrop, setIsValidDrop] = useState(false);
  
  // Refs for tracking
  const dragStartPos = useRef({ x: 0, y: 0 });
  const hasDragStarted = useRef(false);
  const longPressTimer = useRef(null);
  const boardRef = useRef(null);
  const boardBounds = useRef(null);
  
  // Store rotation/flip in ref for calculations during drag
  const rotationRef = useRef(rotation);
  const flippedRef = useRef(flipped);
  
  useEffect(() => {
    rotationRef.current = rotation;
    flippedRef.current = flipped;
    
    // Recalculate preview when rotation/flip changes during drag
    if (isDragging && draggedPiece && previewCell) {
      const coords = getPieceCoords(draggedPiece, rotation, flipped);
      const valid = canPlacePiece(board, previewCell.row, previewCell.col, coords);
      setIsValidDrop(valid);
    }
  }, [rotation, flipped, isDragging, draggedPiece, previewCell, board]);

  // Calculate which board cell the drag position is over
  const calculateBoardCell = useCallback((clientX, clientY) => {
    if (!boardBounds.current) return null;
    
    const { left, top, width, height } = boardBounds.current;
    const cellWidth = width / BOARD_SIZE;
    const cellHeight = height / BOARD_SIZE;
    
    const relX = clientX - left;
    const relY = clientY - top;
    
    const col = Math.floor(relX / cellWidth);
    const row = Math.floor(relY / cellHeight);
    
    // Allow slight overflow for edge placement
    if (row >= -1 && row <= BOARD_SIZE && col >= -1 && col <= BOARD_SIZE) {
      return { 
        row: Math.max(0, Math.min(BOARD_SIZE - 1, row)), 
        col: Math.max(0, Math.min(BOARD_SIZE - 1, col)) 
      };
    }
    
    return null;
  }, []);

  // Check if movement angle indicates scroll vs drag
  const isScrollGesture = useCallback((startX, startY, currentX, currentY) => {
    const dx = Math.abs(currentX - startX);
    const dy = Math.abs(currentY - startY);
    
    if (dx + dy < DRAG_THRESHOLD) return null; // Not enough movement
    
    // Calculate angle from horizontal
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    
    // If angle is steep (mostly vertical), it's a scroll
    return angle > SCROLL_ANGLE_THRESHOLD;
  }, []);

  // Start drag from piece tray
  const startDragFromTray = useCallback((piece, clientX, clientY, elementRect) => {
    if (disabled || usedPieces.includes(piece)) return;
    
    // Calculate offset from touch/click point to element center
    const offsetX = clientX - (elementRect.left + elementRect.width / 2);
    const offsetY = clientY - (elementRect.top + elementRect.height / 2);
    
    setDraggedPiece(piece);
    setDragPosition({ x: clientX, y: clientY });
    setDragOffset({ x: offsetX, y: offsetY });
    setIsDragging(true);
    hasDragStarted.current = true;
    
    // Also select the piece
    onPieceSelect?.(piece);
    soundManager.playPieceSelect();
    
    // Prevent scroll while dragging
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
  }, [disabled, usedPieces, onPieceSelect]);

  // Start drag from board (moving pending piece)
  const startDragFromBoard = useCallback((piece, row, col, clientX, clientY) => {
    if (disabled) return;
    
    setDraggedPiece(piece);
    setDragPosition({ x: clientX, y: clientY });
    setDragOffset({ x: 0, y: 0 });
    setPreviewCell({ row, col });
    setIsDragging(true);
    hasDragStarted.current = true;
    
    soundManager.playClickSound('move');
    
    // Prevent scroll while dragging
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
  }, [disabled]);

  // Update drag position
  const updateDrag = useCallback((clientX, clientY) => {
    if (!isDragging || !draggedPiece) return;
    
    setDragPosition({ x: clientX, y: clientY });
    
    // Update board bounds if we have a ref
    if (boardRef.current) {
      boardBounds.current = boardRef.current.getBoundingClientRect();
    }
    
    // Calculate which cell we're over
    const cell = calculateBoardCell(clientX, clientY);
    
    if (cell && (cell.row !== previewCell?.row || cell.col !== previewCell?.col)) {
      setPreviewCell(cell);
      
      // Check if valid drop position
      const coords = getPieceCoords(draggedPiece, rotationRef.current, flippedRef.current);
      const valid = canPlacePiece(board, cell.row, cell.col, coords);
      setIsValidDrop(valid);
      
      // Update pending move for visual feedback
      onPendingMove?.({ piece: draggedPiece, row: cell.row, col: cell.col });
    }
  }, [isDragging, draggedPiece, previewCell, board, calculateBoardCell, onPendingMove]);

  // End drag
  const endDrag = useCallback((dropped = false) => {
    if (!isDragging) return;
    
    if (dropped && previewCell && isValidDrop && draggedPiece) {
      // Valid drop - confirm the move
      onDrop?.(draggedPiece, previewCell.row, previewCell.col);
      soundManager.playPiecePlace();
    } else if (previewCell && draggedPiece) {
      // Invalid drop or cancelled - keep as pending move
      onPendingMove?.({ piece: draggedPiece, row: previewCell.row, col: previewCell.col });
    }
    
    // Reset state
    setIsDragging(false);
    setDraggedPiece(null);
    setDragPosition({ x: 0, y: 0 });
    setDragOffset({ x: 0, y: 0 });
    setPreviewCell(null);
    setIsValidDrop(false);
    hasDragStarted.current = false;
    
    // Re-enable scroll
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    
    // Clear any pending long press
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, [isDragging, previewCell, isValidDrop, draggedPiece, onDrop, onPendingMove]);

  // Cancel drag
  const cancelDrag = useCallback(() => {
    setIsDragging(false);
    setDraggedPiece(null);
    setDragPosition({ x: 0, y: 0 });
    setPreviewCell(null);
    setIsValidDrop(false);
    hasDragStarted.current = false;
    
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // ==========================================
  // Event Handlers for Piece Tray
  // ==========================================
  
  const createTrayHandlers = useCallback((piece) => {
    if (disabled || usedPieces.includes(piece)) {
      return {};
    }

    let startX = 0;
    let startY = 0;
    let elementRect = null;
    let gestureDecided = false;

    const handleTouchStart = (e) => {
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      elementRect = e.currentTarget.getBoundingClientRect();
      gestureDecided = false;
      dragStartPos.current = { x: startX, y: startY };
    };

    const handleTouchMove = (e) => {
      if (gestureDecided && !hasDragStarted.current) return;
      
      const touch = e.touches[0];
      const currentX = touch.clientX;
      const currentY = touch.clientY;
      
      if (!gestureDecided) {
        const isScroll = isScrollGesture(startX, startY, currentX, currentY);
        
        if (isScroll === null) return; // Not enough movement yet
        
        gestureDecided = true;
        
        if (isScroll) {
          // It's a scroll - don't start drag
          return;
        } else {
          // It's a drag - start dragging
          e.preventDefault();
          startDragFromTray(piece, currentX, currentY, elementRect);
        }
      }
      
      if (hasDragStarted.current) {
        e.preventDefault();
        updateDrag(currentX, currentY);
      }
    };

    const handleTouchEnd = (e) => {
      if (hasDragStarted.current) {
        e.preventDefault();
        endDrag(true);
      } else if (!gestureDecided) {
        // It was a tap - select the piece
        onPieceSelect?.(piece);
        soundManager.playPieceSelect();
      }
      gestureDecided = false;
    };

    // Mouse handlers for desktop
    const handleMouseDown = (e) => {
      if (e.button !== 0) return; // Left click only
      startX = e.clientX;
      startY = e.clientY;
      elementRect = e.currentTarget.getBoundingClientRect();
      dragStartPos.current = { x: startX, y: startY };
      
      // Start drag immediately on mouse (no scroll conflict)
      startDragFromTray(piece, e.clientX, e.clientY, elementRect);
    };

    return {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onMouseDown: handleMouseDown,
    };
  }, [disabled, usedPieces, isScrollGesture, startDragFromTray, updateDrag, endDrag, onPieceSelect]);

  // ==========================================
  // Event Handlers for Board (moving pending piece)
  // ==========================================
  
  const createBoardDragHandlers = useCallback((piece, row, col) => {
    if (disabled || !piece) return {};

    let startX = 0;
    let startY = 0;

    const handleTouchStart = (e) => {
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      dragStartPos.current = { x: startX, y: startY };
      
      // Use long press to initiate drag from board
      longPressTimer.current = setTimeout(() => {
        startDragFromBoard(piece, row, col, startX, startY);
      }, LONG_PRESS_DELAY);
    };

    const handleTouchMove = (e) => {
      const touch = e.touches[0];
      
      // If moved before long press, cancel the timer (it's a scroll)
      if (longPressTimer.current) {
        const dx = Math.abs(touch.clientX - startX);
        const dy = Math.abs(touch.clientY - startY);
        if (dx > 5 || dy > 5) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
      }
      
      if (hasDragStarted.current) {
        e.preventDefault();
        updateDrag(touch.clientX, touch.clientY);
      }
    };

    const handleTouchEnd = (e) => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      
      if (hasDragStarted.current) {
        e.preventDefault();
        endDrag(true);
      }
    };

    const handleMouseDown = (e) => {
      if (e.button !== 0) return;
      startDragFromBoard(piece, row, col, e.clientX, e.clientY);
    };

    return {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onMouseDown: handleMouseDown,
    };
  }, [disabled, startDragFromBoard, updateDrag, endDrag]);

  // ==========================================
  // Global mouse move/up handlers
  // ==========================================
  
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      updateDrag(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
      endDrag(true);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        cancelDrag();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDragging, updateDrag, endDrag, cancelDrag]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  return {
    // State
    isDragging,
    draggedPiece,
    dragPosition,
    dragOffset,
    previewCell,
    isValidDrop,
    
    // Refs
    boardRef,
    
    // Handlers
    createTrayHandlers,
    createBoardDragHandlers,
    cancelDrag,
    
    // For manual control
    startDragFromTray,
    startDragFromBoard,
    updateDrag,
    endDrag,
  };
};

export default useDragAndDrop;
