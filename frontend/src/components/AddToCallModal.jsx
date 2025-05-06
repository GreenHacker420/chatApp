import { useState, useEffect } from 'react';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import { X, UserPlus, Check, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const AddToCallModal = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const { users, addParticipantToGroupCall, activeGroupCall, groupCallParticipants } = useChatStore();
  const { user } = useAuthStore();
  
  // Filter users based on search term and exclude current participants
  const filteredUsers = users.filter(u => {
    // Don't show current user
    if (u._id === user?._id) return false;
    
    // Don't show users already in the call
    if (groupCallParticipants.some(p => p._id === u._id)) return false;
    
    // Filter by search term
    if (searchTerm) {
      return u.fullName.toLowerCase().includes(searchTerm.toLowerCase());
    }
    
    return true;
  });
  
  // Reset selected users when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedUsers([]);
      setSearchTerm('');
    }
  }, [isOpen]);
  
  // Toggle user selection
  const toggleUserSelection = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };
  
  // Add selected users to the call
  const handleAddToCall = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Please select at least one user');
      return;
    }
    
    // Add each selected user to the call
    const promises = selectedUsers.map(userId => 
      addParticipantToGroupCall(userId)
    );
    
    // Wait for all invites to be sent
    await Promise.all(promises);
    
    // Close the modal
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-md mx-4 animate-fadeIn">
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <h3 className="text-lg font-medium">Add People to Call</h3>
          <button 
            onClick={onClose}
            className="btn btn-sm btn-ghost btn-circle"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4">
          {/* Search input */}
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="w-4 h-4 text-base-content/50" />
            </div>
            <input
              type="text"
              className="input input-bordered w-full pl-10"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* User list */}
          <div className="max-h-60 overflow-y-auto">
            {filteredUsers.length > 0 ? (
              filteredUsers.map(user => (
                <div 
                  key={user._id}
                  className={`flex items-center p-2 rounded-lg cursor-pointer hover:bg-base-200 ${
                    selectedUsers.includes(user._id) ? 'bg-base-200' : ''
                  }`}
                  onClick={() => toggleUserSelection(user._id)}
                >
                  <div className="avatar">
                    <div className="w-10 h-10 rounded-full">
                      <img 
                        src={user.profilePic || "/avatar.png"} 
                        alt={user.fullName}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "/avatar.png";
                        }}
                      />
                    </div>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="font-medium">{user.fullName}</p>
                  </div>
                  <div className="flex-shrink-0">
                    {selectedUsers.includes(user._id) ? (
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary-content" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 border border-base-300 rounded-full"></div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center py-4 text-base-content/70">
                {searchTerm ? 'No users found' : 'No users available'}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex justify-end gap-2 p-4 border-t border-base-300">
          <button 
            onClick={onClose}
            className="btn btn-ghost"
          >
            Cancel
          </button>
          <button 
            onClick={handleAddToCall}
            className="btn btn-primary gap-2"
            disabled={selectedUsers.length === 0}
          >
            <UserPlus className="w-4 h-4" />
            Add to Call
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddToCallModal;
