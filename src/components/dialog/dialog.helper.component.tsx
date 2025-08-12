'use client'

import { useEffect, useState } from 'react'
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import ReactMarkdown from 'react-markdown'
import { CircleQuestionMarkIcon } from 'lucide-react'
import { capitalize } from '@/helpers/textTransform'

export function HelperComponent({ topics: initialTopics, className }: { topics: string[], className?: string }) {
    const [topics, setTopics] = useState<string[]>(initialTopics || [])
    const [query, setQuery] = useState('')
    const [selectedTopic, setSelectedTopic] = useState('')
    const [markdown, setMarkdown] = useState('')

    useEffect(() => {
        // Replace this with dynamic logic if needed
        setTopics(initialTopics)
        setSelectedTopic(initialTopics.length > 0 ? initialTopics[0] : '')
    }, [initialTopics])

    useEffect(() => {
        if (selectedTopic) {
            fetch(`/docs/${selectedTopic}`)
                .then(res => res.text())
                .then(text => setMarkdown(text))
                .catch(() => setMarkdown('Error loading file.'))
        }
    }, [selectedTopic])

    const filteredTopics = topics.filter(t =>
        t.toLowerCase().includes(query.toLowerCase())
    )

    return (
        <Dialog>
            <DialogTrigger asChild>
                <CircleQuestionMarkIcon className="h-5 w-5 cursor-pointer hover:text-red-500" />
            </DialogTrigger>
            <DialogContent className="min-w-5xl p-0 gap-2 bg-[#f8f9fa] dark:bg-[#1a1a1a]">
                <DialogTitle className="text-lg font-semibold pt-2 pl-2">
                    Self Help
                </DialogTitle>
                <Card className="overflow-hidden w-full h-[600px]">
                    <CardContent className="grid grid-cols-1 md:grid-cols-[250px_1fr] h-full p-0">
                        {/* Sidebar */}
                        <div className="border-r h-full px-4 flex flex-col">
                            <Input
                                placeholder="Search docs..."
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                className="mb-4"
                            />
                            <ScrollArea className="flex-1 space-y-2">
                                {filteredTopics.map(topic => (
                                    <button
                                        key={topic}
                                        onClick={() => setSelectedTopic(topic)}
                                        className={cn(
                                            "w-full text-left px-2 py-1 cursor-pointer rounded hover:bg-primary/10 text-sm mt-1",
                                            {
                                                "bg-primary/10 font-semibold":
                                                    selectedTopic === topic,
                                            }
                                        )}
                                    >
                                        {capitalize(topic.replace('.md', '').replace(/-/g, ' '))}
                                    </button>
                                ))}
                            </ScrollArea>
                        </div>

                        {/* Markdown Content */}
                        <div className="px-6 overflow-auto">
                            <div className="prose prose-neutral dark:prose-invert max-w-none">
                                <ReactMarkdown
                                    components={{
                                        h1: ({ node, ...props }) => <h1 className="text-3xl font-bold mb-6" {...props} />,
                                        h2: ({ node, ...props }) => <h2 className="text-2xl font-semibold mt-6" {...props} />,
                                        h3: ({ node, ...props }) => <h3 className="text-xl font-medium mt-4" {...props} />,
                                        p: ({ node, ...props }) => <p className="text-sm leading-6" {...props} />,
                                        ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-1" {...props} />,
                                        code: ({ node, inline, className, children, ...props }: any) => {
                                            if (inline) {
                                                return <code className="bg-muted px-1 py-0.5 rounded text-xs">{children}</code>
                                            }
                                            return (
                                                <pre className="bg-muted p-2 rounded overflow-auto text-sm">
                                                    <code className="language-bash">{children}</code>
                                                </pre>
                                            )
                                        },
                                        strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
                                    }}
                                >
                                    {markdown}
                                </ReactMarkdown>
                            </div>
                        </div>

                    </CardContent>
                </Card>
            </DialogContent>
        </Dialog>
    )
}
