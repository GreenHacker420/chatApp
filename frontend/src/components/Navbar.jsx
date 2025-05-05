import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { LogOut, MessageSquare, Settings, User, Menu } from "lucide-react";
import { useState } from "react";

const Navbar = () => {
  const { logout, user } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false); // ✅ Mobile menu state

  return (
    <header
      className="bg-base-100 border-b border-base-300 fixed w-full top-0 z-40
    backdrop-blur-lg bg-base-100/80"
    >
      <div className="container mx-auto px-4 h-16">
        <div className="flex items-center justify-between h-full">
          {/* ✅ Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-all">
            <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-lg font-bold">GutarGU</h1>
          </Link>

          {/* ✅ Desktop Navigation */}
          <div className="hidden sm:flex items-center gap-3">
            {user && (
              <>
                {/* Profile Button - Stylish design */}
                <Link
                  to="/profile"
                  className="relative group overflow-hidden rounded-full pl-2 pr-4 py-1.5 bg-gradient-to-r from-primary to-accent hover:shadow-lg transition-all duration-300 flex items-center gap-2"
                  aria-label="View Profile"
                >
                  <div className="relative z-10 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full border-2 border-white shadow-md overflow-hidden flex-shrink-0">
                      {user.profilePic ? (
                        <img
                          src={user.profilePic}
                          alt="Profile"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/avatar.png";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                      )}
                    </div>
                    <span className="font-medium text-white">My Profile</span>
                  </div>
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                </Link>

                <Link to="/settings" className="btn btn-sm gap-2" aria-label="Settings">
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Settings</span>
                </Link>

                {/* <button
                  className="btn btn-sm btn-outline flex gap-2 items-center"
                  onClick={logout}
                  aria-label="Logout"
                >
                  <LogOut className="size-5" />
                  <span className="hidden sm:inline">Logout</span>
                </button> */}
              </>
            )}
          </div>

          {/* ✅ Mobile Menu Button */}
          <button
            className="sm:hidden btn btn-circle btn-ghost"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* ✅ Mobile Dropdown Menu */}
      {menuOpen && (
        <div className="sm:hidden absolute top-16 right-4 bg-base-100 shadow-lg rounded-lg border border-base-300 p-4 w-56">
          {user && (
            <>
              {/* Profile Link - Stylish design for mobile */}
              <div className="flex items-center justify-center mb-3">
                <Link
                  to="/profile"
                  className="relative overflow-hidden rounded-xl w-full py-3 bg-gradient-to-r from-primary to-accent hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-3"
                  onClick={() => setMenuOpen(false)}
                >
                  <div className="relative z-10 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-white/80 shadow-md overflow-hidden flex-shrink-0">
                      {user.profilePic ? (
                        <img
                          src={user.profilePic}
                          alt="Profile"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/avatar.png";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-white/20 flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                    <span className="font-medium text-white">View My Profile</span>
                  </div>
                  <div className="absolute inset-0 bg-white opacity-0 hover:opacity-10 transition-opacity duration-300"></div>
                </Link>
              </div>

              <div className="border-t border-base-300 my-2 pt-2">
                <Link
                  to="/settings"
                  className="block px-4 py-2 hover:bg-base-200 rounded-lg transition"
                  onClick={() => setMenuOpen(false)}
                >
                  <Settings className="w-4 h-4 inline-block mr-2" />
                  Settings
                </Link>

                <button
                  className="block w-full text-left px-4 py-2 hover:bg-base-200 rounded-lg transition mt-2"
                  onClick={logout}
                >
                  <LogOut className="w-4 h-4 inline-block mr-2" />
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
