import { useState, useRef, useEffect } from 'react';
import { Project, Package, Service } from '@/src/lib/types';
import { AIService } from '@/src/lib/ai-service';

interface ConsultantChatProps {
    project: Project;
    packages: Package[];
    services: Service[];
}

interface Message {
    role: 'user' | 'model'; // 'model' represents the Consultant
    content: string;
}

export default function ConsultantChat({ project, packages, services }: ConsultantChatProps) {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', content: `Hi! I'm your Solutions Architect assistant. I see we're working on **${project.customerName}**. How can I help you select or customize a package today?` }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg = input.trim();
        setInput('');
        setLoading(true);

        const newMessages = [...messages, { role: 'user', content: userMsg } as Message];
        setMessages(newMessages);

        try {
            const historyForApi = newMessages.map(m => ({
                role: m.role,
                content: m.content
            }));

            const responseText = await AIService.chatWithConsultant(
                userMsg,
                project,
                historyForApi,
                packages,
                services
            );

            setMessages([...newMessages, { role: 'model', content: responseText }]);
        } catch (error) {
            console.error("Chat failed:", error);
            setMessages([...newMessages, { role: 'model', content: "I'm having trouble connecting to the consultant brain right now. Please try again." }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Helper to format Markdown-lite (bolding)
    const formatMessage = (content: string) => {
        const parts = content.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i}>{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    return (
        <div className="flex flex-col h-[600px] bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                    AI
                </div>
                <div>
                    <h3 className="font-bold text-neutral-900 dark:text-neutral-100">Package Chat</h3>
                    <p className="text-xs text-neutral-500">Powered by Gemini 2.5</p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`
                            max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed
                            ${msg.role === 'user'
                                ? 'bg-blue-600 text-white rounded-br-none'
                                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-bl-none'}
                        `}>
                            {formatMessage(msg.content)}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-neutral-100 dark:bg-neutral-800 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-1">
                            <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                <div className="relative">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about package recommendations, features, or trade-offs..."
                        className="w-full pl-4 pr-12 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none text-sm h-[50px] max-h-[120px]"
                        rows={1}
                        disabled={loading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || loading}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </div>
                <p className="text-[10px] text-center text-neutral-400 mt-2">
                    AI can make mistakes. Verify critical technical details.
                </p>
            </div>
        </div>
    );
}
