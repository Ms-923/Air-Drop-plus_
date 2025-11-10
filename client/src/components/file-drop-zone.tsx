import { useCallback, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CloudUpload, FileText } from 'lucide-react';

interface FileDropZoneProps {
  onFilesSelected: (files: File[]) => void;
}

export function FileDropZone({ onFilesSelected }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFilesSelected(files);
    }
  }, [onFilesSelected]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFilesSelected(files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onFilesSelected]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <Card 
      className={`border-2 border-dashed transition-colors cursor-pointer hover-elevate ${
        isDragging 
          ? 'border-primary bg-primary/5' 
          : 'border-border bg-card'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      data-testid="card-file-drop-zone"
    >
      <div className="flex flex-col items-center justify-center min-h-48 p-8 text-center">
        <CloudUpload 
          className={`h-12 w-12 mb-4 transition-colors ${
            isDragging ? 'text-primary' : 'text-muted-foreground'
          }`}
        />
        <h3 className="text-lg font-semibold mb-2">
          {isDragging ? 'Drop files here' : 'Drag files here or click to browse'}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Select multiple files to transfer to the connected peer
        </p>
        <Button 
          variant="outline" 
          onClick={(e) => { e.stopPropagation(); handleClick(); }}
          data-testid="button-browse-files"
        >
          <FileText className="mr-2 h-4 w-4" />
          Browse Files
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
          data-testid="input-file-picker"
        />
      </div>
    </Card>
  );
}
