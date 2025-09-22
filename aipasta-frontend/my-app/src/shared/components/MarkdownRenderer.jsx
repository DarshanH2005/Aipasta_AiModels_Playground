import React, { memo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import { motion, AnimatePresence } from 'motion/react';
import { IconCopy, IconCheck, IconChevronDown, IconChevronUp } from '@tabler/icons-react';

// Import highlight.js styles - we'll use a clean theme
import 'highlight.js/styles/github.css';

// Enhanced Code Block Component with Copy Functionality
const CodeBlock = ({ children, className, ...props }) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const code = String(children).replace(/\n$/, '');
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const isLongCode = code.split('\n').length > 15;

  return (
    <div className="relative group my-4">
      {/* Language label and copy button */}
      <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-t-xl border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          {language && (
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-700 px-2 py-1 rounded-md">
              {language.toUpperCase()}
            </span>
          )}
          {isLongCode && (
            <motion.button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isExpanded ? (
                <>
                  <IconChevronUp className="w-3 h-3" />
                  Collapse
                </>
              ) : (
                <>
                  <IconChevronDown className="w-3 h-3" />
                  Expand
                </>
              )}
            </motion.button>
          )}
        </div>
        
        <motion.button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-md transition-all duration-200"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <AnimatePresence mode="wait">
            {copied ? (
              <motion.div
                key="check"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                className="flex items-center gap-1 text-green-600 dark:text-green-400"
              >
                <IconCheck className="w-3 h-3" />
                Copied!
              </motion.div>
            ) : (
              <motion.div
                key="copy"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="flex items-center gap-1"
              >
                <IconCopy className="w-3 h-3" />
                Copy
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
      
      {/* Code content */}
      <div className="relative bg-gray-50 dark:bg-gray-900 rounded-b-xl overflow-hidden">
        <motion.div
          initial={false}
          animate={{ 
            height: isExpanded ? "auto" : "200px",
            transition: { duration: 0.3, ease: "easeInOut" }
          }}
          className="overflow-hidden"
        >
          <pre 
            className="p-4 text-sm leading-relaxed overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
            {...props}
          >
            <code className={className}>
              {children}
            </code>
          </pre>
        </motion.div>
        
        {/* Gradient overlay for collapsed state */}
        {isLongCode && !isExpanded && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-50 dark:from-gray-900 to-transparent pointer-events-none" />
        )}
      </div>
    </div>
  );
};

const MarkdownRenderer = memo(({ 
  content, 
  className = "",
  enableSyntaxHighlighting = true,
  enableGfm = true 
}) => {
  const plugins = [
    enableGfm && remarkGfm,
    enableSyntaxHighlighting && rehypeHighlight,
    rehypeRaw
  ].filter(Boolean);

  const remarkPlugins = plugins.filter(p => p === remarkGfm);
  const rehypePlugins = plugins.filter(p => p !== remarkGfm);

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={{
          // Enhanced heading styles
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 mt-6 first:mt-0 border-b border-gray-200 dark:border-gray-700 pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-5 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 mt-4 first:mt-0">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2 mt-3 first:mt-0">
              {children}
            </h4>
          ),
          h5: ({ children }) => (
            <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 mt-3 first:mt-0">
              {children}
            </h5>
          ),
          h6: ({ children }) => (
            <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 mt-3 first:mt-0">
              {children}
            </h6>
          ),
          
          // Enhanced paragraph spacing
          p: ({ children }) => (
            <p className="text-gray-800 dark:text-gray-200 leading-relaxed mb-4 last:mb-0">
              {children}
            </p>
          ),

          // Enhanced code blocks with copy functionality
          code: ({ node, inline, className, children, ...props }) => {
            if (inline) {
              return (
                <code 
                  className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-1.5 py-0.5 rounded text-sm font-mono border border-gray-200 dark:border-gray-700"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            
            return (
              <CodeBlock className={className} {...props}>
                {children}
              </CodeBlock>
            );
          },

          // Enhanced lists
          ul: ({ children }) => (
            <ul className="space-y-1 mb-4 text-gray-800 dark:text-gray-200">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="space-y-1 mb-4 text-gray-800 dark:text-gray-200 list-decimal list-inside">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="flex items-start">
              <span className="ml-2">{children}</span>
            </li>
          ),

          // Enhanced blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 pl-4 py-2 mb-4 italic text-blue-900 dark:text-blue-100">
              {children}
            </blockquote>
          ),

          // Enhanced tables
          table: ({ children }) => (
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-50 dark:bg-gray-800">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
              {children}
            </td>
          ),

          // Enhanced links
          a: ({ children, href }) => (
            <a 
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline decoration-blue-600/30 hover:decoration-blue-600 transition-colors"
            >
              {children}
            </a>
          ),

          // Enhanced horizontal rule
          hr: () => (
            <hr className="my-8 border-t border-gray-200 dark:border-gray-700" />
          ),

          // Enhanced emphasis
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-900 dark:text-white">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-gray-800 dark:text-gray-200">
              {children}
            </em>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

MarkdownRenderer.displayName = 'MarkdownRenderer';

export default MarkdownRenderer;