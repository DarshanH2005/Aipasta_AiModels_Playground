import React, { useRef } from 'react';
import { IconPaperclip, IconX, IconPhoto, IconMusic, IconVideo, IconFile } from '@tabler/icons-react';

const SimpleUploadButton = ({ 
  attachedFiles = [], 
  onFilesChange, 
  selectedModels = [],
  disabled = false,
  maxFiles = 5,
  maxFileSize = 10 * 1024 * 1024 // 10MB
}) => {
  const fileInputRef = useRef(null);

  // Get supported types from all selected models
  const getSupportedTypes = () => {
    const allTypes = new Set();
    
    selectedModels.forEach(model => {
      if (model?.capabilities?.image) {
        ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].forEach(type => allTypes.add(type));
      }
      if (model?.capabilities?.audio) {
        ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a'].forEach(type => allTypes.add(type));
      }
      if (model?.capabilities?.video) {
        ['video/mp4', 'video/webm', 'video/quicktime'].forEach(type => allTypes.add(type));
      }
    });
    
    return Array.from(allTypes);
  };

  const supportedTypes = getSupportedTypes();
  const hasMultimodalModels = selectedModels.some(model => 
    model?.capabilities?.image || model?.capabilities?.audio || model?.capabilities?.video
  );

  const handleFileSelect = (files) => {
    const fileArray = Array.from(files);
    const validFiles = [];
    const errors = [];

    fileArray.forEach(file => {
      // Check file type
      if (!supportedTypes.includes(file.type)) {
        errors.push(`${file.name}: Unsupported file type`);
        return;
      }

      // Check file size
      if (file.size > maxFileSize) {
        errors.push(`${file.name}: File too large (max ${maxFileSize / 1024 / 1024}MB)`);
        return;
      }

      // Check total files limit
      if (attachedFiles.length + validFiles.length >= maxFiles) {
        errors.push(`Maximum ${maxFiles} files allowed`);
        return;
      }

      validFiles.push({
        file,
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
      });
    });

    if (errors.length > 0) {
      console.warn('File upload errors:', errors);
      // In a real app, you'd show a toast notification here
    }

    if (validFiles.length > 0) {
      onFilesChange([...attachedFiles, ...validFiles]);
    }
  };

  const handleFileInputChange = (e) => {
    handleFileSelect(e.target.files);
    e.target.value = ''; // Reset input
  };

  const removeFile = (fileId) => {
    const updatedFiles = attachedFiles.filter(f => f.id !== fileId);
    onFilesChange(updatedFiles);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type) => {
    if (type.startsWith('image/')) return IconPhoto;
    if (type.startsWith('audio/')) return IconMusic;
    if (type.startsWith('video/')) return IconVideo;
    return IconFile;
  };

  if (!hasMultimodalModels) {
    return null; // Don't show upload button if no multimodal models selected
  }

  return (
    <div className="flex items-center gap-2">
      {/* Upload Button */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || !hasMultimodalModels}
        className="p-2 text-neutral-500 hover:text-purple-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Attach files"
      >
        <IconPaperclip className="w-5 h-5" />
      </button>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={supportedTypes.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Attached Files Count */}
      {attachedFiles.length > 0 && (
        <div className="flex items-center gap-1">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {attachedFiles.length} file{attachedFiles.length > 1 ? 's' : ''}
          </span>
          
          {/* Quick preview of attached files */}
          <div className="flex items-center gap-1">
            {attachedFiles.slice(0, 3).map((fileData) => {
              const FileIcon = getFileIcon(fileData.type);
              return (
                <div
                  key={fileData.id}
                  className="relative group"
                >
                  {fileData.preview ? (
                    <img
                      src={fileData.preview}
                      alt={fileData.name}
                      className="w-6 h-6 object-cover rounded border"
                    />
                  ) : (
                    <FileIcon className="w-4 h-4 text-neutral-400" />
                  )}
                  
                  {/* Remove button on hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(fileData.id);
                    }}
                    className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    style={{ fontSize: '8px' }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
            
            {attachedFiles.length > 3 && (
              <span className="text-xs text-neutral-400">
                +{attachedFiles.length - 3}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleUploadButton;