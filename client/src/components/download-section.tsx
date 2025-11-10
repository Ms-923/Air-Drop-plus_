import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';

interface CompletedFile {
  id: string;
  name: string;
  blob: Blob;
}

interface DownloadSectionProps {
  files: CompletedFile[];
}

export function DownloadSection({ files }: DownloadSectionProps) {
  const handleDownload = (file: CompletedFile) => {
    const url = URL.createObjectURL(file.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (files.length === 0) return null;

  return (
    <Card data-testid="card-downloads">
      <CardHeader>
        <CardTitle className="text-xl">Completed Downloads</CardTitle>
        <CardDescription>
          {files.length} file{files.length !== 1 ? 's' : ''} ready to download
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 border rounded-lg hover-elevate"
              data-testid={`row-download-${file.id}`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                <span className="font-medium truncate" data-testid={`text-download-name-${file.id}`}>
                  {file.name}
                </span>
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={() => handleDownload(file)}
                data-testid={`button-download-${file.id}`}
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
