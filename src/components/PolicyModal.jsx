// PolicyModal.jsx - Fixed to preserve styles from HTML files
// This component extracts BOTH <style> and <body> content

import { useState, useEffect } from 'react';
import { X, ExternalLink, Loader } from 'lucide-react';

const PolicyModal = ({ type, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [styles, setStyles] = useState('');
  const [error, setError] = useState(false);
  
  const title = type === 'privacy' ? 'Privacy Policy' : 'Terms of Service';
  const url = type === 'privacy' ? '/privacy.html' : '/terms.html';
  
  // Fetch content on mount
  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to load');
        const html = await response.text();
        
        // Extract style content from HTML <head>
        const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
        if (styleMatch) {
          // Scope styles to our modal container to avoid conflicts
          const scopedStyles = styleMatch[1]
            .replace(/body\s*{/g, '.policy-content {')
            .replace(/\.container\s*{/g, '.policy-content .container {')
            .replace(/\.header\s*{/g, '.policy-content .header {')
            .replace(/\.logo\s*{/g, '.policy-content .logo {')
            .replace(/\.subtitle\s*{/g, '.policy-content .subtitle {')
            .replace(/\.effective-date\s*{/g, '.policy-content .effective-date {')
            .replace(/\.back-link\s*{/g, '.policy-content .back-link {')
            .replace(/\.footer\s*{/g, '.policy-content .footer {')
            .replace(/h1\s*{/g, '.policy-content h1 {')
            .replace(/h2\s*{/g, '.policy-content h2 {')
            .replace(/p\s*{/g, '.policy-content p {')
            .replace(/ul\s*{/g, '.policy-content ul {')
            .replace(/li\s*{/g, '.policy-content li {')
            .replace(/a\s*{/g, '.policy-content a {')
            .replace(/a:hover\s*{/g, '.policy-content a:hover {');
          setStyles(scopedStyles);
        }
        
        // Extract body content from HTML
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (bodyMatch) {
          // Remove the back-link and footer since we have our own close button
          let bodyContent = bodyMatch[1]
            .replace(/<a[^>]*class="back-link"[^>]*>[\s\S]*?<\/a>/gi, '')
            .replace(/<div[^>]*class="footer"[^>]*>[\s\S]*?<\/div>/gi, '');
          setContent(bodyContent);
        } else {
          setContent(html);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error loading policy:', err);
        setError(true);
        setLoading(false);
      }
    };
    fetchContent();
  }, [url]);
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-cyan-500/30 shadow-[0_0_60px_rgba(34,211,238,0.2)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-cyan-500/20">
          <h2 className="text-lg font-bold text-cyan-300">{title}</h2>
          <div className="flex items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-slate-400 hover:text-cyan-400 transition-colors"
              title="Open in new tab"
            >
              <ExternalLink size={18} />
            </a>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-slate-400 mb-4">Unable to load content</p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300 underline"
              >
                Open in new tab
              </a>
            </div>
          ) : (
            <>
              {/* Inject scoped styles */}
              <style dangerouslySetInnerHTML={{ __html: styles }} />
              {/* Render content with policy-content class for scoped styles */}
              <div 
                className="policy-content"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            </>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-cyan-500/20">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-lg font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PolicyModal;
