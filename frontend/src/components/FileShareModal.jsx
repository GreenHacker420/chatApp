import { useState, useRef } from 'react';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import { X, Upload, Download, File, FileText, FileImage, FileVideo, FileAudio, FilePlus } from 'lucide-react';
import toast from 'react-hot-toast';

const FileShareModal = ({ isOpen, onClose }) => {
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedTab, setSelectedTab] = useState('upload'); // 'upload' or 'download'
  const [availableFiles, setAvailableFiles] = useState([]);
  const [isLanDetected, setIsLanDetected] = useState(false);
  const fileInputRef = useRef(null);
  
  const { selectedUser, activeCall } = useChatStore();
  const { socket, user } = useAuthStore();
  
  // Check if we're on the same LAN
  const checkLanConnection = async () => {
    if (activeCall?.webRTCService) {
      const isLan = activeCall.webRTCService.isUsingLanConnection();
      setIsLanDetected(isLan);
      
      if (isLan) {
        // Request available files from the other user
        socket.emit('requestAvailableFiles', {
          userId: user._id,
          receiverId: selectedUser._id
        });
      }
    } else {
      setIsLanDetected(false);
    }
  };
  
  // Handle file selection
  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
  };
  
  // Get file icon based on type
  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) return <FileImage className="w-6 h-6" />;
    if (fileType.startsWith('video/')) return <FileVideo className="w-6 h-6" />;
    if (fileType.startsWith('audio/')) return <FileAudio className="w-6 h-6" />;
    if (fileType.startsWith('text/')) return <FileText className="w-6 h-6" />;
    return <File className="w-6 h-6" />;
  };
  
  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };
  
  // Handle file upload
  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Please select files to upload');
      return;
    }
    
    if (!isLanDetected) {
      toast.error('LAN connection not detected. File sharing is only available on the same network.');
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Create a WebRTC data channel for file transfer
      if (activeCall?.webRTCService) {
        const result = await activeCall.webRTCService.sendFiles(
          selectedUser._id, 
          files,
          (progress) => setUploadProgress(progress)
        );
        
        if (result.success) {
          toast.success('Files shared successfully');
          setFiles([]);
          fileInputRef.current.value = '';
        } else {
          toast.error(`Failed to share files: ${result.error}`);
        }
      } else {
        toast.error('No active call connection');
      }
    } catch (error) {
      console.error('Error sharing files:', error);
      toast.error('Failed to share files');
    } finally {
      setIsUploading(false);
    }
  };
  
  // Handle file download
  const handleDownload = async (fileId) => {
    try {
      const file = availableFiles.find(f => f.id === fileId);
      if (!file) {
        toast.error('File not found');
        return;
      }
      
      if (activeCall?.webRTCService) {
        const result = await activeCall.webRTCService.requestFile(
          selectedUser._id,
          fileId,
          (progress) => {
            // Update progress for this specific file
            setAvailableFiles(prev => 
              prev.map(f => f.id === fileId ? { ...f, downloadProgress: progress } : f)
            );
          }
        );
        
        if (result.success) {
          // Create download link
          const url = URL.createObjectURL(result.file);
          const a = document.createElement('a');
          a.href = url;
          a.download = file.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          toast.success(`Downloaded ${file.name}`);
        } else {
          toast.error(`Failed to download file: ${result.error}`);
        }
      } else {
        toast.error('No active call connection');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };
  
  // Initialize when modal opens
  useState(() => {
    if (isOpen) {
      checkLanConnection();
      
      // Listen for available files
      const handleAvailableFiles = (data) => {
        if (data.senderId === selectedUser?._id) {
          setAvailableFiles(data.files.map(file => ({
            ...file,
            downloadProgress: 0
          })));
        }
      };
      
      socket.on('availableFiles', handleAvailableFiles);
      
      return () => {
        socket.off('availableFiles', handleAvailableFiles);
      };
    }
  }, [isOpen, selectedUser]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-md mx-4 animate-fadeIn">
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <h3 className="text-lg font-medium">Share Files {isLanDetected ? '(LAN)' : ''}</h3>
          <button 
            onClick={onClose}
            className="btn btn-sm btn-ghost btn-circle"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {!isLanDetected ? (
          <div className="p-8 text-center">
            <div className="text-error mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2">LAN Connection Not Detected</h3>
            <p className="text-base-content/70">
              File sharing is only available when both users are on the same local network.
              Make sure you and the other user are connected to the same WiFi or LAN.
            </p>
          </div>
        ) : (
          <>
            <div className="tabs w-full">
              <button 
                className={`tab tab-bordered flex-1 ${selectedTab === 'upload' ? 'tab-active' : ''}`}
                onClick={() => setSelectedTab('upload')}
              >
                Upload Files
              </button>
              <button 
                className={`tab tab-bordered flex-1 ${selectedTab === 'download' ? 'tab-active' : ''}`}
                onClick={() => setSelectedTab('download')}
              >
                Available Files
              </button>
            </div>
            
            <div className="p-4">
              {selectedTab === 'upload' ? (
                <div>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-base-200 hover:bg-base-300">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-2 text-base-content/70" />
                        <p className="mb-2 text-sm text-base-content/70">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-base-content/50">
                          Any file type (MAX 100MB)
                        </p>
                      </div>
                      <input 
                        ref={fileInputRef}
                        type="file" 
                        className="hidden" 
                        multiple 
                        onChange={handleFileSelect} 
                      />
                    </label>
                  </div>
                  
                  {files.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Selected Files</h4>
                      <div className="max-h-40 overflow-y-auto">
                        {files.map((file, index) => (
                          <div key={index} className="flex items-center p-2 border-b border-base-200">
                            <div className="mr-2 text-primary">
                              {getFileIcon(file.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{file.name}</p>
                              <p className="text-xs text-base-content/50">{formatFileSize(file.size)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {isUploading && (
                    <div className="mt-4">
                      <progress 
                        className="progress progress-primary w-full" 
                        value={uploadProgress} 
                        max="100"
                      ></progress>
                      <p className="text-xs text-center mt-1">{uploadProgress.toFixed(0)}% Uploaded</p>
                    </div>
                  )}
                  
                  <div className="mt-4">
                    <button 
                      className="btn btn-primary w-full"
                      onClick={handleUpload}
                      disabled={files.length === 0 || isUploading}
                    >
                      {isUploading ? 'Uploading...' : 'Share Files'}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {availableFiles.length === 0 ? (
                    <div className="text-center py-8">
                      <FilePlus className="w-12 h-12 mx-auto text-base-content/30 mb-4" />
                      <p className="text-base-content/70">No files available for download</p>
                      <p className="text-xs text-base-content/50 mt-2">
                        Ask the other user to share files with you
                      </p>
                    </div>
                  ) : (
                    <div>
                      <h4 className="font-medium mb-2">Available Files</h4>
                      <div className="max-h-60 overflow-y-auto">
                        {availableFiles.map((file) => (
                          <div key={file.id} className="flex items-center p-2 border-b border-base-200">
                            <div className="mr-2 text-primary">
                              {getFileIcon(file.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{file.name}</p>
                              <p className="text-xs text-base-content/50">{formatFileSize(file.size)}</p>
                              
                              {file.downloadProgress > 0 && file.downloadProgress < 100 && (
                                <progress 
                                  className="progress progress-primary w-full mt-1" 
                                  value={file.downloadProgress} 
                                  max="100"
                                ></progress>
                              )}
                            </div>
                            <button 
                              className="btn btn-sm btn-ghost"
                              onClick={() => handleDownload(file.id)}
                              disabled={file.downloadProgress > 0 && file.downloadProgress < 100}
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FileShareModal;
