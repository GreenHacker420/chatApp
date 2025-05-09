import { useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Image, Video, Send, X } from "lucide-react";
import toast from "react-hot-toast";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const fileInputRef = useRef(null);
  const { sendMessage, selectedUser } = useChatStore();
  const { socket } = useAuthStore();

  // ✅ Emit "typing" event when user types
  const handleTyping = (e) => {
    setText(e.target.value);
    if (socket && selectedUser && selectedUser._id) {
      const authUserId = useAuthStore.getState().user?._id;
      if (authUserId) {
        socket.emit("typing", {
          senderId: authUserId,
          receiverId: selectedUser._id
        });
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedImageTypes = ["image/jpeg", "image/png", "image/gif"];
    const allowedVideoTypes = ["video/mp4", "video/quicktime"];

    if (![...allowedImageTypes, ...allowedVideoTypes].includes(file.type)) {
      return toast.error("Invalid file type. Only images and videos are allowed.");
    }

    if (file.size > 5 * 1024 * 1024) {
      return toast.error("File size must be less than 5MB.");
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result);
      setMediaType(allowedImageTypes.includes(file.type) ? "image" : "video");
    };
    reader.readAsDataURL(file);
  };

  const removeMedia = () => {
    setMediaPreview(null);
    setMediaType(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !mediaPreview) return;

    try {
      if (!selectedUser || !selectedUser._id) {
        toast.error("Cannot send message: No recipient selected");
        return false;
      }

      console.log("Sending message to:", selectedUser?.fullName || selectedUser?._id);

      // Only send if there's actual content or media
      const trimmedText = text.trim();
      const messageData = {
        content: trimmedText, // Use content field as expected by backend
        receiverId: selectedUser._id,
        image: mediaType === "image" ? mediaPreview : null,
        video: mediaType === "video" ? mediaPreview : null,
      };

      console.log("Message data prepared:", {
        content: trimmedText ? "Text content present" : "No text content",
        receiverId: selectedUser._id,
        hasImage: !!messageData.image,
        hasVideo: !!messageData.video
      });

      // Send message through the store which handles API call and socket emission
      const result = await sendMessage(messageData);
      console.log("Message sent result:", result ? "Success" : "Failed");

      // ✅ Emit "stopTyping" event when message is sent
      if (socket && selectedUser) {
        const authUserId = useAuthStore.getState().user?._id;
        socket.emit("stopTyping", {
          senderId: authUserId,
          receiverId: selectedUser._id
        });
        console.log("Stop typing event emitted");
      } else {
        console.log("Socket not available for stop typing event:", {
          socketExists: !!socket,
          selectedUserExists: !!selectedUser
        });
      }

      // ✅ Clear input
      setText("");
      removeMedia();
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message");
    }
  };

  return (
    <div className="p-4 w-full border-t border-base-300 bg-base-100 sticky bottom-0 left-0 right-0">
      {mediaPreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            {mediaType === "image" ? (
              <img
                src={mediaPreview}
                alt="Preview"
                className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
              />
            ) : (
              <video
                src={mediaPreview}
                className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
                controls
              />
            )}
            <button
              onClick={removeMedia}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300 flex items-center justify-center"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            className="w-full input input-bordered rounded-lg input-sm sm:input-md"
            placeholder="Type a message..."
            value={text}
            onChange={handleTyping}
          />
          <input
            type="file"
            accept="image/*,video/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />

          <button
            type="button"
            className={`hidden sm:flex btn btn-circle
                     ${mediaType === "image" ? "text-emerald-500" : "text-zinc-400"}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Image size={20} />
          </button>

          <button
            type="button"
            className={`hidden sm:flex btn btn-circle
                     ${mediaType === "video" ? "text-blue-500" : "text-zinc-400"}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Video size={20} />
          </button>
        </div>
        <button
          type="submit"
          className="btn btn-sm btn-circle"
          disabled={!text.trim() && !mediaPreview}
        >
          <Send size={22} />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
