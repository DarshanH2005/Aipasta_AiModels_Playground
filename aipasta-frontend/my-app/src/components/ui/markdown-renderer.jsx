import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';

// Import highlight.js styles - we'll use a clean theme
import 'highlight.js/styles/github.css';

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

          // Enhanced code blocks
          code: ({ node, inline, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            
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
              <div className="relative group mb-4">
                {language && (
                  <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 px-4 py-2 text-xs text-gray-600 dark:text-gray-400 font-medium border border-gray-200 dark:border-gray-700 rounded-t-lg border-b-0">
                    <span className="uppercase tracking-wide">{language}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(String(children).replace(/\n$/, ''))}
                      className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-gray-800 dark:hover:text-gray-200"
                      title="Copy code"
                    >
                      Copy
                    </button>
                  </div>
                )}
                <pre className={`overflow-x-auto bg-gray-50 dark:bg-gray-900 p-4 text-sm leading-relaxed border border-gray-200 dark:border-gray-700 ${language ? 'rounded-b-lg' : 'rounded-lg'}`}>
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
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