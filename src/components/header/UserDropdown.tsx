import { useMemo, useState } from "react";
import { LogOut } from "lucide-react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { clearAuthSession } from "@/utils/authStorage";

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, setUser } = useUser();
  const navigate = useNavigate();
  const displayName = user?.name || "User";
  const displayEmail = user?.email || "user@example.com";

  const initials = useMemo(() => {
    if (!displayName) return "IW";
    const tokens = displayName.trim().split(/\s+/);
    return tokens
      .map((token) => token.charAt(0).toUpperCase())
      .join("")
      .slice(0, 2) || "IW";
  }, [displayName]);

  function toggleDropdown() {
    setIsOpen((prev) => !prev);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  function handleSignOut() {
    closeDropdown();
    clearAuthSession();
    setUser(null);
    navigate("/auth", { replace: true });
  }

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="rainbow-border flex h-11 w-56 items-center justify-between rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surfaceAlt)]/95 px-2 py-1 text-left text-[var(--admin-text)] shadow-[0_18px_40px_rgba(1,62,126,0.12)] transition hover:shadow-[0_22px_44px_rgba(1,62,126,0.18)]"
      >
        <span className="mr-2.5 grid h-8 w-8 place-items-center rounded-2xl bg-gradient-to-br from-[#0f5bd8] to-[#013E7E] text-xs font-semibold uppercase tracking-wide text-white">
          {initials}
        </span>
        <span className="flex flex-1 flex-col overflow-hidden">
          <span className="truncate text-sm font-semibold leading-tight">{displayName}</span>
          <span className="truncate text-[11px] uppercase tracking-[0.3em] text-[var(--admin-mutedText)]">
            {displayEmail}
          </span>
        </span>
        <svg
          className={`h-5 w-5 text-[var(--admin-mutedText)] transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          viewBox="0 0 18 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.3125 8.65625L9 13.3437L13.6875 8.65625"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute right-0 mt-[17px] flex w-[320px] flex-col rounded-3xl border border-[var(--admin-border)] bg-[var(--admin-surfaceAlt)]/98 p-4 text-[var(--admin-text)] shadow-[var(--admin-cardShadow)]"
      >
        <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)]/80 p-3">
          <span className="block text-base font-semibold text-[var(--admin-text)]">{displayName}</span>
          <span className="mt-0.5 block text-sm text-[var(--admin-mutedText)]">{displayEmail}</span>
        </div>

        {/* <ul className="mt-4 flex flex-col gap-1">
          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              to="/profile"
              className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-[var(--admin-text)] transition hover:bg-[var(--admin-primarySoft)] hover:text-[var(--admin-primary)]"
            >
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-[var(--admin-primarySoft)] text-[var(--admin-primary)]">
                <Settings className="h-4 w-4" />
              </span>
              Edit profile
            </DropdownItem>
          </li>
          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              to="/profile"
              className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-[var(--admin-text)] transition hover:bg-[var(--admin-primarySoft)] hover:text-[var(--admin-primary)]"
            >
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-[var(--admin-primarySoft)] text-[var(--admin-primary)]">
                <ShieldCheck className="h-4 w-4" />
              </span>
              Account settings
            </DropdownItem>
          </li>
          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              to="/profile"
              className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-[var(--admin-text)] transition hover:bg-[var(--admin-primarySoft)] hover:text-[var(--admin-primary)]"
            >
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-[var(--admin-primarySoft)] text-[var(--admin-primary)]">
                <LifeBuoy className="h-4 w-4" />
              </span>
              Support
            </DropdownItem>
          </li>
        </ul> */}

        <button
          onClick={handleSignOut}
          className="rainbow-border mt-4 flex items-center justify-center gap-2 rounded-2xl border border-[var(--admin-border)] px-3 py-2 text-sm font-semibold text-[var(--admin-text)] transition hover:border-[var(--admin-accent)] hover:bg-[var(--admin-primarySoft)]/80 hover:text-[var(--admin-primary)]"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </Dropdown>
    </div>
  );
}
