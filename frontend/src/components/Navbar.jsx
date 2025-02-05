import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { LogOut, MessageSquare, Settings, User, Menu } from "lucide-react";
import { useState } from "react";

const Navbar = () => {
  const { logout, authUser } = useAuthStore();
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
          <div className="hidden sm:flex items-center gap-2">
            <Link to="/settings" className="btn btn-sm gap-2" aria-label="Settings">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </Link>

            {authUser && (
              <>
                <Link to="/profile" className="btn btn-sm gap-2" aria-label="Profile">
                  <User className="size-5" />
                  <span className="hidden sm:inline">Profile</span>
                </Link>

                <button
                  className="btn btn-sm btn-outline flex gap-2 items-center"
                  onClick={logout}
                  aria-label="Logout"
                >
                  <LogOut className="size-5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
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
        <div className="sm:hidden absolute top-16 right-4 bg-base-100 shadow-lg rounded-lg border border-base-300 p-4 w-48">
          <Link
            to="/settings"
            className="block px-4 py-2 hover:bg-base-200 rounded-lg transition"
            onClick={() => setMenuOpen(false)}
          >
            <Settings className="w-4 h-4 inline-block mr-2" />
            Settings
          </Link>

          {authUser && (
            <>
              <Link
                to="/profile"
                className="block px-4 py-2 hover:bg-base-200 rounded-lg transition"
                onClick={() => setMenuOpen(false)}
              >
                <User className="w-4 h-4 inline-block mr-2" />
                Profile
              </Link>

              <button
                className="block w-full text-left px-4 py-2 hover:bg-base-200 rounded-lg transition"
                onClick={logout}
              >
                <LogOut className="w-4 h-4 inline-block mr-2" />
                Logout
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
