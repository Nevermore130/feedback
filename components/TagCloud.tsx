import React, { useMemo, useState } from 'react';

interface TagCloudProps {
  tags: Array<{ tag: string; count: number }>;
  onTagClick?: (tag: string) => void;
  maxTags?: number;
}

// Clean, modern color palette
const TAG_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
];

export const TagCloud: React.FC<TagCloudProps> = ({
  tags,
  onTagClick,
  maxTags = 30,
}) => {
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);

  const processedTags = useMemo(() => {
    if (tags.length === 0) return [];

    // Sort by count descending, take top tags
    const sortedTags = [...tags].sort((a, b) => b.count - a.count).slice(0, maxTags);
    const maxCount = Math.max(...sortedTags.map(t => t.count));
    const minCount = Math.min(...sortedTags.map(t => t.count));
    const countRange = maxCount - minCount || 1;

    return sortedTags.map((item, index) => {
      const normalizedCount = (item.count - minCount) / countRange;

      // Font size: 12px to 28px based on frequency (more compact range)
      const fontSize = 12 + normalizedCount * 16;

      // Opacity: 0.5 to 1.0 based on frequency
      const opacity = 0.5 + normalizedCount * 0.5;

      // Font weight
      const fontWeight = normalizedCount > 0.6 ? 600 : normalizedCount > 0.3 ? 500 : 400;

      // Color based on index for variety
      const color = TAG_COLORS[index % TAG_COLORS.length];

      return {
        ...item,
        fontSize: Math.round(fontSize),
        opacity,
        fontWeight,
        color,
        normalizedCount,
      };
    });
  }, [tags, maxTags]);

  if (tags.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-400">
        <p>No tags available</p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 py-6 px-4 mx-auto w-2/3 min-h-[180px]">
      {processedTags.map((item, index) => {
        const isHovered = hoveredTag === item.tag;
        const isOtherHovered = hoveredTag !== null && !isHovered;

        return (
          <button
            key={`${item.tag}-${index}`}
            onClick={() => onTagClick?.(item.tag)}
            onMouseEnter={() => setHoveredTag(item.tag)}
            onMouseLeave={() => setHoveredTag(null)}
            className="inline-flex items-center gap-1 transition-all duration-200 ease-out cursor-pointer hover:scale-105 leading-none"
            style={{
              fontSize: `${item.fontSize}px`,
              fontWeight: item.fontWeight,
              color: item.color,
              opacity: isOtherHovered ? 0.25 : item.opacity,
              transform: isHovered ? 'scale(1.08)' : 'scale(1)',
            }}
          >
            <span className="whitespace-nowrap">{item.tag}</span>
            <span
              className="text-[0.7em] font-normal transition-opacity duration-200"
              style={{
                opacity: isHovered ? 0.8 : 0.5,
                color: item.color,
              }}
            >
              {item.count}
            </span>
          </button>
        );
      })}
    </div>
  );
};

// Modern card-based tag cloud with gradient backgrounds
export const TagCardCloud: React.FC<TagCloudProps> = ({
  tags,
  onTagClick,
  maxTags = 24,
}) => {
  const processedTags = useMemo(() => {
    if (tags.length === 0) return [];

    const displayTags = tags.slice(0, maxTags);
    const maxCount = Math.max(...displayTags.map(t => t.count));
    const minCount = Math.min(...displayTags.map(t => t.count));
    const countRange = maxCount - minCount || 1;

    // Vibrant gradient pairs for cards
    const gradients = [
      ['#FF6B6B', '#FF8E53'], // Coral to Orange
      ['#667EEA', '#764BA2'], // Indigo to Purple
      ['#11998E', '#38EF7D'], // Teal to Emerald
      ['#FC466B', '#3F5EFB'], // Rose to Blue
      ['#F093FB', '#F5576C'], // Pink to Coral
      ['#4FACFE', '#00F2FE'], // Blue to Cyan
      ['#43E97B', '#38F9D7'], // Green to Teal
      ['#FA709A', '#FEE140'], // Pink to Yellow
    ];

    return displayTags.map((item, index) => {
      const normalizedCount = (item.count - minCount) / countRange;
      const gradient = gradients[index % gradients.length];

      // Size tier: lg, md, sm based on frequency
      const sizeTier = normalizedCount > 0.6 ? 'lg' : normalizedCount > 0.3 ? 'md' : 'sm';

      return {
        ...item,
        normalizedCount,
        gradient,
        sizeTier,
      };
    });
  }, [tags, maxTags]);

  if (tags.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <p>No tags available</p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3 p-4 justify-center">
      {processedTags.map((item, index) => {
        const sizeClasses = {
          lg: 'px-5 py-2.5 text-base',
          md: 'px-4 py-2 text-sm',
          sm: 'px-3 py-1.5 text-xs',
        };

        return (
          <button
            key={`${item.tag}-${index}`}
            onClick={() => onTagClick?.(item.tag)}
            className={`
              relative rounded-xl font-medium text-white
              transition-all duration-300 ease-out
              hover:scale-105 hover:shadow-lg hover:-translate-y-0.5
              active:scale-100
              ${sizeClasses[item.sizeTier]}
            `}
            style={{
              background: `linear-gradient(135deg, ${item.gradient[0]}, ${item.gradient[1]})`,
              boxShadow: `0 4px 14px ${item.gradient[0]}30`,
            }}
          >
            <span className="relative z-10 flex items-center gap-2">
              {item.tag}
              <span className="opacity-70 text-[0.75em]">({item.count})</span>
            </span>
          </button>
        );
      })}
    </div>
  );
};

// Animated bubble cloud with floating effect
export const TagBubbleCloud: React.FC<TagCloudProps> = ({
  tags,
  onTagClick,
  maxTags = 20,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const processedTags = useMemo(() => {
    if (tags.length === 0) return [];

    const displayTags = tags.slice(0, maxTags);
    const maxCount = Math.max(...displayTags.map(t => t.count));
    const minCount = Math.min(...displayTags.map(t => t.count));
    const countRange = maxCount - minCount || 1;

    // Vibrant bubble colors with gradient backgrounds
    const colors = [
      { gradient: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)', ring: 'ring-orange-300' },
      { gradient: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)', ring: 'ring-purple-300' },
      { gradient: 'linear-gradient(135deg, #4FACFE 0%, #00F2FE 100%)', ring: 'ring-cyan-300' },
      { gradient: 'linear-gradient(135deg, #43E97B 0%, #38F9D7 100%)', ring: 'ring-teal-300' },
      { gradient: 'linear-gradient(135deg, #FA709A 0%, #FEE140 100%)', ring: 'ring-pink-300' },
      { gradient: 'linear-gradient(135deg, #A18CD1 0%, #FBC2EB 100%)', ring: 'ring-violet-300' },
      { gradient: 'linear-gradient(135deg, #FF9A9E 0%, #FAD0C4 100%)', ring: 'ring-rose-300' },
      { gradient: 'linear-gradient(135deg, #89F7FE 0%, #66A6FF 100%)', ring: 'ring-blue-300' },
    ];

    return displayTags.map((item, index) => {
      const normalizedCount = (item.count - minCount) / countRange;
      // Size: 75px to 140px
      const size = 75 + normalizedCount * 65;
      const colorScheme = colors[index % colors.length];
      // Animation delay for staggered floating effect
      const animationDelay = (index * 0.2) % 3;

      return {
        ...item,
        size: Math.round(size),
        colorScheme,
        animationDelay,
        normalizedCount,
      };
    });
  }, [tags, maxTags]);

  if (tags.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <p>No tags available</p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-wrap items-center justify-center gap-5 p-8 min-h-[360px] bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 rounded-2xl overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-gradient-to-br from-pink-200/20 to-purple-200/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-gradient-to-br from-cyan-200/20 to-blue-200/20 rounded-full blur-3xl" />
      </div>

      {processedTags.map((item, index) => {
        const isHovered = hoveredIndex === index;

        return (
          <button
            key={`${item.tag}-${index}`}
            onClick={() => onTagClick?.(item.tag)}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            className={`
              relative rounded-full flex flex-col items-center justify-center
              transition-all duration-300 ease-out text-white
              ${isHovered ? `ring-4 ${item.colorScheme.ring} scale-110 z-10` : ''}
            `}
            style={{
              width: `${item.size}px`,
              height: `${item.size}px`,
              background: item.colorScheme.gradient,
              boxShadow: isHovered
                ? '0 20px 40px rgba(0,0,0,0.2), 0 0 0 4px rgba(255,255,255,0.3)'
                : '0 8px 24px rgba(0,0,0,0.12), 0 0 0 2px rgba(255,255,255,0.2)',
              animation: `float 4s ease-in-out ${item.animationDelay}s infinite`,
            }}
          >
            <span
              className="font-bold text-center leading-tight px-3 truncate max-w-[90%] drop-shadow-sm"
              style={{ fontSize: `${Math.max(12, item.size / 6.5)}px` }}
            >
              {item.tag}
            </span>
            <span
              className="opacity-90 mt-0.5 font-medium"
              style={{ fontSize: `${Math.max(10, item.size / 8)}px` }}
            >
              {item.count}
            </span>
          </button>
        );
      })}

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-6px) rotate(1deg); }
          50% { transform: translateY(-10px) rotate(0deg); }
          75% { transform: translateY(-6px) rotate(-1deg); }
        }
      `}</style>
    </div>
  );
};

// Heat map style horizontal bar chart
export const TagHeatMap: React.FC<TagCloudProps> = ({
  tags,
  onTagClick,
  maxTags = 12,
}) => {
  const processedTags = useMemo(() => {
    if (tags.length === 0) return [];

    const displayTags = tags.slice(0, maxTags);
    const maxCount = Math.max(...displayTags.map(t => t.count));

    return displayTags.map((item) => ({
      ...item,
      percentage: (item.count / maxCount) * 100,
    }));
  }, [tags, maxTags]);

  if (tags.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <p>No tags available</p>
      </div>
    );
  }

  // Vibrant color gradient from cool to warm based on percentage
  const getHeatColor = (percentage: number): { gradient: string; shadow: string } => {
    if (percentage > 80) return {
      gradient: 'linear-gradient(90deg, #FF6B6B 0%, #FF8E53 100%)',
      shadow: 'rgba(255, 107, 107, 0.3)'
    };
    if (percentage > 60) return {
      gradient: 'linear-gradient(90deg, #FA709A 0%, #FEE140 100%)',
      shadow: 'rgba(250, 112, 154, 0.3)'
    };
    if (percentage > 40) return {
      gradient: 'linear-gradient(90deg, #667EEA 0%, #764BA2 100%)',
      shadow: 'rgba(102, 126, 234, 0.3)'
    };
    if (percentage > 20) return {
      gradient: 'linear-gradient(90deg, #4FACFE 0%, #00F2FE 100%)',
      shadow: 'rgba(79, 172, 254, 0.3)'
    };
    return {
      gradient: 'linear-gradient(90deg, #43E97B 0%, #38F9D7 100%)',
      shadow: 'rgba(67, 233, 123, 0.3)'
    };
  };

  return (
    <div className="space-y-3 p-5 bg-gradient-to-br from-slate-50 to-white rounded-2xl">
      {processedTags.map((item, index) => {
        const heatStyle = getHeatColor(item.percentage);
        return (
          <button
            key={`${item.tag}-${index}`}
            onClick={() => onTagClick?.(item.tag)}
            className="w-full group"
          >
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-slate-700 w-28 text-left truncate group-hover:text-indigo-600 transition-colors">
                {item.tag}
              </span>
              <div className="flex-1 h-10 bg-slate-100/80 rounded-xl overflow-hidden relative backdrop-blur-sm">
                <div
                  className="h-full rounded-xl transition-all duration-500 ease-out group-hover:brightness-110"
                  style={{
                    width: `${Math.max(item.percentage, 8)}%`,
                    background: heatStyle.gradient,
                    boxShadow: `0 4px 12px ${heatStyle.shadow}`,
                  }}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-600 bg-white/60 px-2 py-0.5 rounded-md backdrop-blur-sm">
                  {item.count}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

// Treemap-style grid layout
export const TagTreeMap: React.FC<TagCloudProps> = ({
  tags,
  onTagClick,
  maxTags = 16,
}) => {
  const processedTags = useMemo(() => {
    if (tags.length === 0) return [];

    const displayTags = tags.slice(0, maxTags);
    const maxCount = Math.max(...displayTags.map(t => t.count));
    const minCount = Math.min(...displayTags.map(t => t.count));
    const countRange = maxCount - minCount || 1;

    // Vibrant gradients for treemap cells
    const colors = [
      { gradient: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)', shadow: 'rgba(255, 107, 107, 0.35)' },
      { gradient: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)', shadow: 'rgba(102, 126, 234, 0.35)' },
      { gradient: 'linear-gradient(135deg, #4FACFE 0%, #00F2FE 100%)', shadow: 'rgba(79, 172, 254, 0.35)' },
      { gradient: 'linear-gradient(135deg, #43E97B 0%, #38F9D7 100%)', shadow: 'rgba(67, 233, 123, 0.35)' },
      { gradient: 'linear-gradient(135deg, #FA709A 0%, #FEE140 100%)', shadow: 'rgba(250, 112, 154, 0.35)' },
      { gradient: 'linear-gradient(135deg, #A18CD1 0%, #FBC2EB 100%)', shadow: 'rgba(161, 140, 209, 0.35)' },
      { gradient: 'linear-gradient(135deg, #FF9A9E 0%, #FECFEF 100%)', shadow: 'rgba(255, 154, 158, 0.35)' },
      { gradient: 'linear-gradient(135deg, #89F7FE 0%, #66A6FF 100%)', shadow: 'rgba(137, 247, 254, 0.35)' },
    ];

    return displayTags.map((item, index) => {
      const normalizedCount = (item.count - minCount) / countRange;
      // Span: 1-2 columns based on frequency
      const colSpan = normalizedCount > 0.6 ? 2 : 1;
      const rowSpan = normalizedCount > 0.8 ? 2 : 1;

      return {
        ...item,
        normalizedCount,
        colSpan,
        rowSpan,
        colorStyle: colors[index % colors.length],
      };
    });
  }, [tags, maxTags]);

  if (tags.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <p>No tags available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-3 p-5 auto-rows-[90px] bg-gradient-to-br from-slate-50 to-white rounded-2xl">
      {processedTags.map((item, index) => (
        <button
          key={`${item.tag}-${index}`}
          onClick={() => onTagClick?.(item.tag)}
          className="rounded-2xl text-white font-medium flex flex-col items-center justify-center transition-all duration-300 ease-out hover:scale-[1.03] hover:z-10 active:scale-100"
          style={{
            gridColumn: `span ${item.colSpan}`,
            gridRow: `span ${item.rowSpan}`,
            background: item.colorStyle.gradient,
            boxShadow: `0 8px 24px ${item.colorStyle.shadow}`,
          }}
        >
          <span className="text-base font-bold truncate max-w-[90%] px-3 drop-shadow-sm">{item.tag}</span>
          <span className="text-sm opacity-90 font-medium mt-0.5">{item.count}</span>
        </button>
      ))}
    </div>
  );
};
