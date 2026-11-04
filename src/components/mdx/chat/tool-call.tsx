import { Children, Fragment, isValidElement, type ComponentProps, type ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { WrenchIcon } from '@phosphor-icons/react/dist/ssr/Wrench';
import { CodeBlock, CodeBlockContent } from '@/components/ui/ai-elements/code-block';
import { ChatActivity } from './activity';

type ChatToolCallProps = Omit<ComponentProps<'div'>, 'title'> & {
  name: string;
  title: string;
  defaultOpen?: boolean;
};

function codeText(node: ReactNode): string {
  return Children.toArray(node).map((child): string => {
    if (typeof child === 'string' || typeof child === 'number') return String(child);
    return isValidElement<{ children?: ReactNode }>(child) ? codeText(child.props.children) : '';
  }).join('');
}

function toolContent(children: ReactNode): ReactNode {
  return Children.toArray(children).map((child, index) => {
    if (!isValidElement<{ children?: ReactNode; 'data-language'?: string }>(child)) return child;
    // Fumadocs wraps compiled code fences in fragments.
    if (child.type === Fragment) return <Fragment key={child.key ?? index}>{toolContent(child.props.children)}</Fragment>;
    if (!child.props['data-language']) return child;
    return <CodeBlock key={child.key ?? index} size="sm" className="rounded-sm">
      <CodeBlockContent wrap className="max-h-64" aria-label={child.props['data-language']}>{codeText(child.props.children)}</CodeBlockContent>
    </CodeBlock>;
  });
}

export async function ChatToolCall({ name, title, defaultOpen, children, className, ...props }: ChatToolCallProps) {
  const t = await getTranslations('Ui');
  const label = `${title} · ${t('toolCallComplete')}`;
  const content = <div data-slot="tool-call-content" className="min-w-0 text-sm leading-reading [&>p]:m-0 [&>p+p]:mt-3 [&>div]:my-3 [&>div:last-child]:mb-0">
    <p className="font-mono text-xs text-muted-foreground">{name}</p>
    {toolContent(children)}
  </div>;
  return <ChatActivity {...props} defaultOpen={defaultOpen} data-component="chat-tool-call" data-tool={name} title={title} label={label} icon={<WrenchIcon />} className={className}>
    {content}
  </ChatActivity>;
}
