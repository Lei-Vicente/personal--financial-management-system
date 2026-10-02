import React from 'react';

export const MetricCardSkeleton = () => (
  <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl p-6 h-[150px] flex flex-col justify-between shadow-xs animate-pulse premium-card">
    <div className="flex justify-between items-center">
      <div className="h-3 w-28 bg-[#F5F5F3] rounded-full"></div>
      <div className="w-8 h-8 rounded-xl bg-[#F5F5F3]"></div>
    </div>
    <div>
      <div className="h-8 w-36 bg-[#EBEBE7] rounded-lg mb-3"></div>
      <div className="h-3 w-44 bg-[#F5F5F3] rounded-full"></div>
    </div>
  </div>
);

export const ListSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-2 w-full">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl p-3.5 flex items-center justify-between animate-pulse shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-[#F5F5F3]"></div>
          <div className="space-y-2.5">
            <div className="h-3.5 w-32 bg-[#EBEBE7] rounded-full"></div>
            <div className="h-2.5 w-20 bg-[#F5F5F3] rounded-full"></div>
          </div>
        </div>
        <div className="space-y-2.5 flex flex-col items-end">
          <div className="h-3.5 w-16 bg-[#EBEBE7] rounded-full"></div>
          <div className="h-2.5 w-12 bg-[#F5F5F3] rounded-full"></div>
        </div>
      </div>
    ))}
  </div>
);

export const ChartSkeleton = () => (
  <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl p-5 sm:p-6 shadow-xs animate-pulse premium-card h-full flex flex-col min-h-[300px]">
    <div className="flex items-center space-x-2 pb-4 mb-5 border-b border-[#D9D9D4]/60">
      <div className="w-7 h-7 rounded-lg bg-[#F5F5F3]"></div>
      <div className="h-4 w-40 bg-[#EBEBE7] rounded-full"></div>
    </div>
    <div className="flex-1 bg-[#F5F5F3]/40 rounded-xl w-full h-full"></div>
  </div>
);

export const SectionSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="bg-[#FFFFFF] border border-[#D9D9D4] rounded-2xl p-5 sm:p-6 shadow-xs animate-pulse premium-card h-full flex flex-col">
    <div className="flex items-center space-x-2 pb-4 mb-4 border-b border-[#D9D9D4]/60">
      <div className="w-7 h-7 rounded-lg bg-[#F5F5F3]"></div>
      <div className="h-4 w-36 bg-[#EBEBE7] rounded-full"></div>
    </div>
    <div className="space-y-4 mt-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-20 bg-[#F5F5F3]/70 rounded-xl w-full"></div>
      ))}
    </div>
  </div>
);
