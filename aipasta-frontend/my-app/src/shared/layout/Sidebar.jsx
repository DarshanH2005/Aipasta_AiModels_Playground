"use client";
import { cn } from "../../lib/utils";
import React, { useState, createContext, useContext, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { IconMenu2, IconX } from "@tabler/icons-react";

const SidebarContext = createContext(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
  locked = false,
  setLocked,
}) => {
  const [openState, setOpenState] = useState(false);
  const [lockedState, setLockedState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;
  const isLocked = locked !== undefined ? locked : lockedState;
  const setIsLocked = setLocked !== undefined ? setLocked : setLockedState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate, locked: isLocked, setLocked: setIsLocked }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
  locked,
  setLocked,
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate} locked={locked} setLocked={setLocked}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = (props) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...props} />
    </>
  );
};

export const SidebarFooter = ({ children, className }) => {
  return (
    <div className={cn('mt-auto flex-shrink-0 w-full px-3 py-2', className)}>
      {children}
    </div>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}) => {
  const { open, setOpen, animate, locked } = useSidebar();
  
  // When locked, force sidebar to be open
  const shouldBeOpen = locked ? true : open;
  
  return (
    <>
      <motion.div
        className={cn(
          "h-full py-4 hidden md:flex md:flex-col bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-white/30 dark:border-neutral-700/50 w-[250px] shrink-0 rounded-2xl shadow-2xl transition-all duration-300 hover:shadow-3xl hover:bg-white/90 dark:hover:bg-neutral-900/90",
          className
        )}
        animate={{
          width: animate ? (shouldBeOpen ? "250px" : "60px") : "250px",
          paddingLeft: animate ? (shouldBeOpen ? "12px" : "8px") : "12px",
          paddingRight: animate ? (shouldBeOpen ? "12px" : "8px") : "12px",
        }}
        whileHover={{
          scale: 1.01,
          transition: { duration: 0.2 }
        }}
        onMouseEnter={() => {
          // When not locked, expand the sidebar on hover
          if (!locked) setOpen(true);
        }}
        onMouseLeave={() => {
          // When not locked, collapse the sidebar on mouse leave
          if (!locked) setOpen(false);
        }}
        {...props}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {children}
        </div>
      </motion.div>
    </>
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}) => {
  const { open, setOpen } = useSidebar();
  return (
    <>
      <div
        className={cn(
          "h-10 px-4 py-4 flex flex-row md:hidden  items-center justify-between bg-neutral-100 dark:bg-neutral-800 w-full"
        )}
        {...props}
      >
        <div className="flex justify-end z-20 w-full">
          <IconMenu2
            className="text-neutral-800 dark:text-neutral-200"
            onClick={() => setOpen(!open)}
          />
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{
                duration: 0.3,
                ease: "easeInOut",
              }}
              className={cn(
                "fixed h-full w-full inset-0 bg-white dark:bg-neutral-900 p-10 z-[100] flex flex-col justify-between",
                className
              )}
            >
              <div
                className="absolute right-10 top-10 z-50 text-neutral-800 dark:text-neutral-200"
                onClick={() => setOpen(!open)}
              >
                <IconX />
              </div>
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export const SidebarLink = ({
  link,
  className,
  ...props
}) => {
  const { open, animate } = useSidebar();
  return (
    <motion.a
      href={link.href}
      className={cn(
        "flex items-center p-3 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-white/60 dark:hover:bg-neutral-800/60 hover:text-neutral-800 dark:hover:text-neutral-100 transition-all duration-200 group/sidebar backdrop-blur-sm border border-transparent hover:border-white/20 dark:hover:border-neutral-700/20 hover:shadow-lg",
        className
      )}
      whileHover={{ 
        scale: 1.02,
        x: 2,
        transition: { duration: 0.15 }
      }}
      whileTap={{ 
        scale: 0.98,
        transition: { duration: 0.1 }
      }}
      {...props}
    >
      <motion.div 
        className="flex-shrink-0"
        whileHover={{ rotate: 5 }}
        transition={{ duration: 0.15 }}
      >
        {link.icon}
      </motion.div>

      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="ml-3 text-sm font-medium whitespace-nowrap inline-block !p-0 !m-0"
      >
        {link.label}
      </motion.span>
    </motion.a>
  );
};