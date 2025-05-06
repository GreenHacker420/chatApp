import { useState, useEffect } from 'react';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import { Wifi, Phone, Video, RefreshCw, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';

const LanUsers = ({ onClose }) => {
  const [lanUsers, setLanUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { startCall } = useChatStore();
  const { socket, user } = useAuthStore();
  const [isElectron, setIsElectron] = useState(false);

  // Check if running in Electron
  useEffect(() => {
    setIsElectron(!!window.electron);
  }, []);

  // Listen for LAN users updates from Electron
  useEffect(() => {
    if (isElectron) {
      const cleanup = window.electron.onLanUsersUpdate((users) => {
        setLanUsers(users);
      });

      return cleanup;
    }
  }, [isElectron]);

  // Scan for LAN users
  const scanLan = async () => {
    setIsLoading(true);
    try {
      if (isElectron) {
        // Use Electron's native LAN scanning
        const users = await window.electron.scanLan();
        setLanUsers(users);
      } else {
        // Use WebRTC for browser-based LAN detection
        if (socket) {
          socket.emit('scan-lan');

          // Listen for scan results
          const handleLanUsers = (users) => {
            setLanUsers(users);
            socket.off('lan-users', handleLanUsers);
          };

          socket.on('lan-users', handleLanUsers);

          // Set timeout to clear listener if no response
          setTimeout(() => {
            socket.off('lan-users', handleLanUsers);
            setIsLoading(false);
          }, 10000);
        }
      }
    } catch (error) {
      console.error('Error scanning LAN:', error);
      toast.error('Failed to scan LAN');
    } finally {
      setIsLoading(false);
    }
  };

  // Call a LAN user
  const callLanUser = (userId, isVideo = false) => {
    try {
      startCall(userId, isVideo, true);
      toast.success(`Calling user over LAN...`);
    } catch (error) {
      console.error('Error calling LAN user:', error);
      toast.error('Failed to initiate call');
    }
  };

  // Initial scan
  useEffect(() => {
    if (socket) {
      scanLan();
    }
  }, [socket]);

  return (
    <div className="bg-base-100 rounded-lg shadow-md p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wifi className="text-primary" size={20} />
          <h3 className="font-semibold text-lg">LAN Users</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={scanLan}
            className="btn btn-sm btn-ghost"
            disabled={isLoading}
            aria-label="Refresh LAN users"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="btn btn-sm btn-ghost"
              aria-label="Close LAN users panel"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {lanUsers.length === 0 ? (
        <div className="text-center py-6 text-gray-500">
          <Users className="mx-auto mb-2 text-gray-400" size={32} />
          <p>No users found on your local network</p>
          <p className="text-sm mt-1">Make sure other users are connected to the same network</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lanUsers.map(user => (
            <div key={user.id} className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
              <div>
                <h4 className="font-medium">{user.name}</h4>
                <p className="text-xs text-gray-500">{user.ip}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => callLanUser(user.id, false)}
                  className="btn btn-sm btn-circle btn-primary"
                  aria-label={`Audio call ${user.name}`}
                >
                  <Phone size={16} />
                </button>
                <button
                  onClick={() => callLanUser(user.id, true)}
                  className="btn btn-sm btn-circle btn-primary"
                  aria-label={`Video call ${user.name}`}
                >
                  <Video size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        <p>LAN connections provide better call quality and allow file sharing</p>
      </div>
    </div>
  );
};

export default LanUsers;
