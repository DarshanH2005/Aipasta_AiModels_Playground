import React, { useState, useRef } from 'react';
import { IconPhoto, IconMusic, IconVideo, IconFile, IconX, IconUpload, IconPlayerPlay, IconEye } from '@tabler/icons-react';

const MultimodalInput = ({ 
  attachedFiles = [], 
  onFilesChange, 
  selectedModel,
  disabled = false,
  maxFiles = 5,
  maxFileSize = 10 * 1024 * 1024 // 10MB
}) => {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const supportedTypes = {
    image: selectedModel?.capabilities?.image ? ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] : [],
    audio: selectedModel?.capabilities?.audio ? ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a'] : [],
    video: selectedModel?.capabilities?.video ? ['video/mp4', 'video/webm', 'video/quicktime'] : []
  };

  const allSupportedTypes = [...supportedTypes.image, ...supportedTypes.audio, ...supportedTypes.video];

  const handleFileSelect = (files) => {
    const fileArray = Array.from(files);
    const validFiles = [];
    const errors = [];

    fileArray.forEach(file => {
      // Check file type
      if (!allSupportedTypes.includes(file.type)) {
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
      // In a real app, you'd show these errors in a toast or alert
      console.warn('File upload errors:', errors);
    }

    if (validFiles.length > 0) {
      onFilesChange([...attachedFiles, ...validFiles]);
    }
  };

  const handleFileInputChange = (e) => {
    handleFileSelect(e.target.files);
    e.target.value = ''; // Reset input
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (disabled) return;
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
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

  if (!selectedModel?.capabilities || 
      (!selectedModel.capabilities.image && !selectedModel.capabilities.audio && !selectedModel.capabilities.video)) {
    return (
      <div className="text-xs text-neutral-400 dark:text-neutral-500 p-2 text-center">
        Current model doesn't support file attachments
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
          dragActive 
            ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/20' 
            : 'border-neutral-300 dark:border-neutral-600 hover:border-neutral-400 dark:hover:border-neutral-500'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onClick={() => !disabled && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={allSupportedTypes.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />
        
        <IconUpload className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
        <div className="text-sm text-neutral-600 dark:text-neutral-400">
          {dragActive ? 'Drop files here' : 'Click or drag files to upload'}
        </div>
        <div className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
          Supports: {[
            selectedModel.capabilities.image && 'Images',
            selectedModel.capabilities.audio && 'Audio',
            selectedModel.capabilities.video && 'Video'
          ].filter(Boolean).join(', ')}
        </div>
        <div className="text-xs text-neutral-400 dark:text-neutral-600 mt-0.5">
          Max {maxFiles} files, {maxFileSize / 1024 / 1024}MB each
        </div>
      </div>

      {/* Attached Files */}
      {attachedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Attached Files ({attachedFiles.length})
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {attachedFiles.map((fileData) => {
              const FileIcon = getFileIcon(fileData.type);
              return (
                <div
                  key={fileData.id}
                  className="flex items-center gap-3 p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg"
                >
                  {/* File Preview/Icon */}
                  {fileData.preview ? (
                    <div className="relative w-10 h-10 flex-shrink-0">
                      <img
                        src={fileData.preview}
                        alt={fileData.name}
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                  ) : (
                    <FileIcon className="w-8 h-8 text-neutral-500 flex-shrink-0" />
                  )}
                  
                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                      {fileData.name}
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      {formatFileSize(fileData.size)} • {fileData.type.split('/')[1].toUpperCase()}
                    </div>
                  </div>
                  
                  {/* Remove Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(fileData.id);
                    }}
                    className="p-1 text-neutral-400 hover:text-red-500 transition-colors"
                    title="Remove file"
                  >
                    <IconX className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultimodalInput;