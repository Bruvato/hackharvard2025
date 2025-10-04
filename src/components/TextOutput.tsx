import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Copy, Trash2, Type, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface TextEntry {
  id: string;
  text: string;
  timestamp: Date;
}

interface TextOutputProps {
  entries: TextEntry[];
  currentText: string;
  onClearHistory: () => void;
}

export function TextOutput({ entries, currentText, onClearHistory }: TextOutputProps) {
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const copyAllText = () => {
    const allText = entries.map(entry => entry.text).join(' ');
    copyToClipboard(allText);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4">
      {/* Current Recognition */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2">
              <Type className="h-5 w-5" />
              Current Text
            </h2>
            {currentText && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(currentText)}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            )}
          </div>
          
          <div className="min-h-[100px] p-4 bg-muted rounded-lg">
            {currentText ? (
              <p className="text-lg leading-relaxed">{currentText}</p>
            ) : (
              <p className="text-muted-foreground italic">
                Start recognition to see converted text appear here...
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* History */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recognition History ({entries.length})
            </h2>
            <div className="flex gap-2">
              {entries.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyAllText}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onClearHistory}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                </>
              )}
            </div>
          </div>

          <ScrollArea className="h-[300px]">
            {entries.length > 0 ? (
              <div className="space-y-3">
                {entries.map((entry, index) => (
                  <div key={entry.id}>
                    <div className="flex items-start justify-between gap-4 p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm leading-relaxed">{entry.text}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTime(entry.timestamp)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(entry.text)}
                        className="shrink-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    {index < entries.length - 1 && <Separator className="my-2" />}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No recognition history yet</p>
                <p className="text-sm">Recognized gestures will appear here</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </Card>
    </div>
  );
}