import React from 'react';

interface BrandMarkProps {
  className?: string;
}

export const BrandMark: React.FC<BrandMarkProps> = ({ className = 'w-7 h-7' }) => {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="36" height="36" rx="8" className="fill-[#0B172A] dark:fill-emerald-500/15" />
      <rect
        x="0.75"
        y="0.75"
        width="34.5"
        height="34.5"
        rx="7.25"
        className="stroke-emerald-500/40"
        strokeWidth="1.5"
      />
      <path
        d="M18 7.5C23.799 7.5 28.5 12.201 28.5 18C28.5 23.799 23.799 28.5 18 28.5C12.201 28.5 7.5 23.799 7.5 18"
        stroke="#10B981"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M11 9.5L7.5 18L13.5 15.5"
        stroke="#14B8A6"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 12.5V23.5M12.5 18H23.5"
        className="stroke-white dark:stroke-emerald-200"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
};
