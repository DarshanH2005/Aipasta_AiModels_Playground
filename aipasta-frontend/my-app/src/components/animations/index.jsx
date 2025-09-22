"use client";

import { motion } from "motion/react";
import { forwardRef } from "react";

// Fade In Animation
export const FadeIn = forwardRef(({ 
  children, 
  duration = 0.3, 
  delay = 0, 
  className = "",
  ...props 
}, ref) => (
  <motion.div
    ref={ref}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ 
      duration, 
      delay,
      ease: "easeOut"
    }}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
));
FadeIn.displayName = "FadeIn";

// Slide Up Animation
export const SlideUp = forwardRef(({ 
  children, 
  duration = 0.4, 
  delay = 0, 
  distance = 20,
  className = "",
  ...props 
}, ref) => (
  <motion.div
    ref={ref}
    initial={{ 
      opacity: 0, 
      y: distance 
    }}
    animate={{ 
      opacity: 1, 
      y: 0 
    }}
    exit={{ 
      opacity: 0, 
      y: -distance 
    }}
    transition={{ 
      duration, 
      delay,
      ease: "easeOut"
    }}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
));
SlideUp.displayName = "SlideUp";

// Slide In From Right
export const SlideInRight = forwardRef(({ 
  children, 
  duration = 0.3, 
  delay = 0, 
  distance = 30,
  className = "",
  ...props 
}, ref) => (
  <motion.div
    ref={ref}
    initial={{ 
      opacity: 0, 
      x: distance 
    }}
    animate={{ 
      opacity: 1, 
      x: 0 
    }}
    exit={{ 
      opacity: 0, 
      x: distance 
    }}
    transition={{ 
      duration, 
      delay,
      ease: "easeOut"
    }}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
));
SlideInRight.displayName = "SlideInRight";

// Slide In From Left
export const SlideInLeft = forwardRef(({ 
  children, 
  duration = 0.3, 
  delay = 0, 
  distance = 30,
  className = "",
  ...props 
}, ref) => (
  <motion.div
    ref={ref}
    initial={{ 
      opacity: 0, 
      x: -distance 
    }}
    animate={{ 
      opacity: 1, 
      x: 0 
    }}
    exit={{ 
      opacity: 0, 
      x: -distance 
    }}
    transition={{ 
      duration, 
      delay,
      ease: "easeOut"
    }}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
));
SlideInLeft.displayName = "SlideInLeft";

// Scale In Animation
export const ScaleIn = forwardRef(({ 
  children, 
  duration = 0.2, 
  delay = 0, 
  scale = 0.95,
  className = "",
  ...props 
}, ref) => (
  <motion.div
    ref={ref}
    initial={{ 
      opacity: 0, 
      scale 
    }}
    animate={{ 
      opacity: 1, 
      scale: 1 
    }}
    exit={{ 
      opacity: 0, 
      scale 
    }}
    transition={{ 
      duration, 
      delay,
      ease: "easeOut"
    }}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
));
ScaleIn.displayName = "ScaleIn";

// Stagger Container for animating children
export const StaggerContainer = forwardRef(({ 
  children, 
  staggerDelay = 0.1,
  className = "",
  ...props 
}, ref) => (
  <motion.div
    ref={ref}
    initial="hidden"
    animate="visible"
    exit="hidden"
    variants={{
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: staggerDelay,
          delayChildren: 0.1
        }
      }
    }}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
));
StaggerContainer.displayName = "StaggerContainer";

// Stagger Item for use within StaggerContainer
export const StaggerItem = forwardRef(({ 
  children, 
  className = "",
  ...props 
}, ref) => (
  <motion.div
    ref={ref}
    variants={{
      hidden: { 
        opacity: 0, 
        y: 20 
      },
      visible: { 
        opacity: 1, 
        y: 0,
        transition: {
          duration: 0.4,
          ease: "easeOut"
        }
      }
    }}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
));
StaggerItem.displayName = "StaggerItem";

// Premium Button with hover animations
export const PremiumButton = forwardRef(({ 
  children, 
  variant = "primary",
  size = "md",
  className = "",
  disabled = false,
  loading = false,
  onClick,
  ...props 
}, ref) => {
  const variants = {
    primary: "bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg shadow-purple-500/25",
    secondary: "bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 shadow-sm",
    ghost: "hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300",
    gradient: "bg-gradient-to-r from-blue-600 via-purple-600 to-purple-700 hover:from-blue-700 hover:via-purple-700 hover:to-purple-800 text-white shadow-lg shadow-purple-500/25 relative overflow-hidden"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm rounded-lg",
    md: "px-4 py-2 text-sm rounded-xl",
    lg: "px-6 py-3 text-base rounded-xl",
    xl: "px-8 py-4 text-lg rounded-2xl"
  };

  return (
    <motion.button
      ref={ref}
      className={`
        ${variants[variant]}
        ${sizes[size]}
        ${className}
        font-medium transition-all duration-200 
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
        dark:focus:ring-offset-neutral-900
        relative inline-flex items-center justify-center
      `}
      whileHover={!disabled ? { 
        scale: 1.02,
        transition: { duration: 0.15 }
      } : {}}
      whileTap={!disabled ? { 
        scale: 0.98,
        transition: { duration: 0.1 }
      } : {}}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {variant === "gradient" && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12"
          initial={{ x: "-100%" }}
          whileHover={{ x: "100%" }}
          transition={{ duration: 0.6 }}
        />
      )}
      
      {loading ? (
        <div className="flex items-center gap-2">
          <motion.div
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <span>Loading...</span>
        </div>
      ) : children}
    </motion.button>
  );
});
PremiumButton.displayName = "PremiumButton";

// Typing Animation for AI responses
export const TypingAnimation = ({ className = "" }) => (
  <div className={`flex items-center space-x-1 ${className}`}>
    <motion.div
      className="w-2 h-2 bg-current rounded-full"
      animate={{ 
        scale: [1, 1.2, 1],
        opacity: [0.5, 1, 0.5]
      }}
      transition={{ 
        duration: 1,
        repeat: Infinity,
        delay: 0
      }}
    />
    <motion.div
      className="w-2 h-2 bg-current rounded-full"
      animate={{ 
        scale: [1, 1.2, 1],
        opacity: [0.5, 1, 0.5]
      }}
      transition={{ 
        duration: 1,
        repeat: Infinity,
        delay: 0.2
      }}
    />
    <motion.div
      className="w-2 h-2 bg-current rounded-full"
      animate={{ 
        scale: [1, 1.2, 1],
        opacity: [0.5, 1, 0.5]
      }}
      transition={{ 
        duration: 1,
        repeat: Infinity,
        delay: 0.4
      }}
    />
  </div>
);

// Skeleton Loader
export const SkeletonLoader = ({ 
  width = "100%", 
  height = "1rem", 
  rounded = "rounded",
  className = "" 
}) => (
  <motion.div
    className={`${rounded} bg-gradient-to-r from-neutral-200 via-neutral-300 to-neutral-200 dark:from-neutral-700 dark:via-neutral-600 dark:to-neutral-700 ${className}`}
    style={{ 
      width, 
      height,
      backgroundSize: "200% 100%"
    }}
    animate={{
      backgroundPosition: ["200% 0", "-200% 0"]
    }}
    transition={{
      duration: 1.5,
      repeat: Infinity,
      ease: "linear"
    }}
  />
);

// Floating Action Button with pulse effect
export const FloatingButton = forwardRef(({ 
  children, 
  className = "",
  pulse = false,
  ...props 
}, ref) => (
  <motion.button
    ref={ref}
    className={`
      fixed bottom-6 right-6 w-14 h-14 
      bg-gradient-to-r from-purple-600 to-purple-700 
      hover:from-purple-700 hover:to-purple-800
      text-white rounded-full shadow-lg shadow-purple-500/25
      flex items-center justify-center
      focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
      dark:focus:ring-offset-neutral-900
      z-50 ${className}
    `}
    whileHover={{ 
      scale: 1.1,
      transition: { duration: 0.2 }
    }}
    whileTap={{ 
      scale: 0.95,
      transition: { duration: 0.1 }
    }}
    animate={pulse ? {
      boxShadow: [
        "0 0 0 0 rgba(147, 51, 234, 0.7)",
        "0 0 0 10px rgba(147, 51, 234, 0)",
        "0 0 0 0 rgba(147, 51, 234, 0)"
      ]
    } : {}}
    transition={pulse ? {
      duration: 2,
      repeat: Infinity,
    } : {}}
    {...props}
  >
    {children}
  </motion.button>
));
FloatingButton.displayName = "FloatingButton";

// Glass Card with backdrop blur
export const GlassCard = forwardRef(({ 
  children, 
  className = "",
  hover = true,
  ...props 
}, ref) => (
  <motion.div
    ref={ref}
    className={`
      backdrop-blur-md bg-white/80 dark:bg-neutral-900/80
      border border-white/20 dark:border-neutral-700/50
      rounded-xl shadow-xl
      ${hover ? 'hover:shadow-2xl hover:bg-white/90 dark:hover:bg-neutral-900/90' : ''}
      transition-all duration-300
      ${className}
    `}
    whileHover={hover ? { 
      y: -2,
      transition: { duration: 0.2 }
    } : {}}
    {...props}
  >
    {children}
  </motion.div>
));
GlassCard.displayName = "GlassCard";