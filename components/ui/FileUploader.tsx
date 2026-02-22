// components/ui/FileUploader.tsx
import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Cloud, Plus } from 'lucide-react'
import { cn } from '@/utils/cn'

interface FileUploaderProps {
  acceptedTypes: Record<string, string[]>
  maxSize?: number
  multiple?: boolean
  onFilesSelected: (files: File[]) => void
}

export function FileUploader({
  acceptedTypes,
  maxSize = 104857600, // 100MB
  multiple = true,
  onFilesSelected
}: FileUploaderProps) {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = [...uploadedFiles, ...acceptedFiles]
    setUploadedFiles(newFiles)
    onFilesSelected(newFiles)
  }, [uploadedFiles, onFilesSelected])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes,
    maxSize,
    multiple
  })

  const removeFile = (index: number) => {
    const updated = uploadedFiles.filter((_, i) => i !== index)
    setUploadedFiles(updated)
    onFilesSelected(updated)
  }

  return (
    <div className="w-full space-y-4">
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer",
          "transition-all duration-200",
          isDragActive
            ? "border-red-500 bg-red-50 scale-[1.02]"
            : "border-gray-300 hover:border-red-400 hover:bg-gray-50"
        )}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-4">
          <div className={cn(
            "w-20 h-20 rounded-full flex items-center justify-center",
            "bg-red-100 transition-transform duration-200",
            isDragActive && "scale-110"
          )}>
            <Upload className="w-10 h-10 text-red-500" />
          </div>

          <div>
            <p className="text-xl font-semibold text-gray-700">
              {isDragActive ? "Drop files here" : "Select Files"}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              or drag and drop files here
            </p>
          </div>

          {/* Cloud Providers */}
          <div className="flex items-center gap-3 mt-2">
            <CloudButton icon="gdrive" label="Google Drive" />
            <CloudButton icon="dropbox" label="Dropbox" />
            <CloudButton icon="onedrive" label="OneDrive" />
          </div>

          <p className="text-xs text-gray-400">
            Max file size: {Math.round(maxSize / 1048576)}MB
          </p>
        </div>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          {uploadedFiles.map((file, index) => (
            <FileItem
              key={index}
              file={file}
              onRemove={() => removeFile(index)}
            />
          ))}

          {/* Add More */}
          <button
            {...getRootProps()}
            className="w-full py-3 border border-dashed border-gray-300
                       rounded-xl text-sm text-gray-500 hover:border-red-400
                       hover:text-red-500 transition-colors flex items-center
                       justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add More Files
          </button>
        </div>
      )}
    </div>
  )
}
