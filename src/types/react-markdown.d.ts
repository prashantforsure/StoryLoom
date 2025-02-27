declare module 'react-markdown' {
    import { FC, ReactNode } from 'react';
    
    interface ReactMarkdownProps {
      children: string;
      remarkPlugins?: any[];
      components?: {
        [key: string]: FC<{
          node?: any;
          inline?: boolean;
          className?: string;
          children?: ReactNode;
          [key: string]: any;
        }>;
      };
    }
    
    const ReactMarkdown: FC<ReactMarkdownProps>;
    export default ReactMarkdown;
  }