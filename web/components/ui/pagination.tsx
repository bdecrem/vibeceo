"use client"

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  hasNextPage: boolean
  hasPreviousPage: boolean
  totalCount: number
  limit: number
  theme?: 'orange' | 'green'
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  hasNextPage,
  hasPreviousPage,
  totalCount,
  limit,
  theme = 'orange'
}: PaginationProps) {
  const startItem = (currentPage - 1) * limit + 1
  const endItem = Math.min(currentPage * limit, totalCount)

  const getPageNumbers = () => {
    const pages = []
    const maxVisible = 5
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      let start = Math.max(1, currentPage - 2)
      let end = Math.min(totalPages, currentPage + 2)
      
      if (currentPage <= 3) {
        end = maxVisible
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - maxVisible + 1
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
    }
    
    return pages
  }

  if (totalPages <= 1) return null

  // Theme colors
  const colors = {
    orange: {
      border: 'rgba(255, 102, 0, 0.3)',
      borderGlow: 'rgba(255, 102, 0, 0.1)',
      primary: '#ff6600',
      secondary: '#ff9900',
      gradient: 'linear-gradient(45deg, #ff6600, #ff3366)',
      shadow: 'rgba(255, 102, 0, 0.2)',
      shadowStrong: 'rgba(255, 102, 0, 0.3)',
      shadowActive: 'rgba(255, 102, 0, 0.4)',
      hover: 'rgba(255, 102, 0, 0.1)',
      disabled: 'rgba(255, 102, 0, 0.3)',
      disabledText: 'rgba(255, 102, 0, 0.5)'
    },
    green: {
      border: 'rgba(0, 255, 102, 0.3)',
      borderGlow: 'rgba(0, 255, 102, 0.1)',
      primary: '#00ff66',
      secondary: '#66ff99',
      gradient: 'linear-gradient(45deg, #00ff66, #9900ff)',
      shadow: 'rgba(0, 255, 102, 0.2)',
      shadowStrong: 'rgba(0, 255, 102, 0.3)',
      shadowActive: 'rgba(0, 255, 102, 0.4)',
      hover: 'rgba(0, 255, 102, 0.1)',
      disabled: 'rgba(0, 255, 102, 0.3)',
      disabledText: 'rgba(0, 255, 102, 0.5)'
    }
  }

  const themeColors = colors[theme]

  return (
    <>
      <section className="pagination-section">
        <div className="pagination">
          <button
            className={`pagination-btn prev-btn ${!hasPreviousPage ? "disabled" : ""}`}
            onClick={() => hasPreviousPage && onPageChange(currentPage - 1)}
            disabled={!hasPreviousPage}
          >
            ← Previous
          </button>

          <div className="page-numbers">
            {getPageNumbers().map((pageNumber) => (
              <button
                key={pageNumber}
                className={`page-btn ${currentPage === pageNumber ? "active" : ""}`}
                onClick={() => onPageChange(pageNumber)}
              >
                {pageNumber}
              </button>
            ))}
          </div>

          <button
            className={`pagination-btn next-btn ${!hasNextPage ? "disabled" : ""}`}
            onClick={() => hasNextPage && onPageChange(currentPage + 1)}
            disabled={!hasNextPage}
          >
            Next →
          </button>
        </div>
      </section>

      <style jsx>{`
        .pagination-section {
          margin-top: 60px;
          margin-bottom: 40px;
          display: flex;
          justify-content: center;
        }

        .pagination {
          display: flex;
          align-items: center;
          gap: 15px;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(15px);
          border: 2px solid ${themeColors.border};
          border-radius: 50px;
          padding: 15px 25px;
          box-shadow: 
            0 8px 30px rgba(0, 0, 0, 0.4), 
            inset 0 0 20px ${themeColors.borderGlow};
        }

        .pagination-btn {
          padding: 10px 20px;
          background: rgba(0, 0, 0, 0.7);
          border: 2px solid ${themeColors.primary};
          color: ${themeColors.primary};
          border-radius: 25px;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 1px;
          box-shadow: 
            0 4px 15px ${themeColors.shadow}, 
            0 0 10px ${themeColors.borderGlow};
        }

        .pagination-btn:hover:not(.disabled) {
          background: ${themeColors.hover};
          transform: translateY(-2px);
          box-shadow: 
            0 8px 25px ${themeColors.shadowStrong}, 
            0 0 20px ${themeColors.shadow};
        }

        .pagination-btn.disabled {
          opacity: 0.4;
          cursor: not-allowed;
          border-color: ${themeColors.disabled};
          color: ${themeColors.disabledText};
        }

        .page-numbers {
          display: flex;
          gap: 8px;
        }

        .page-btn {
          width: 45px;
          height: 45px;
          background: rgba(0, 0, 0, 0.7);
          border: 2px solid ${themeColors.disabled};
          color: ${themeColors.secondary};
          border-radius: 50%;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 
            0 4px 15px ${themeColors.shadow}, 
            0 0 10px ${themeColors.borderGlow};
        }

        .page-btn:hover {
          background: ${themeColors.hover};
          transform: translateY(-2px) scale(1.05);
          box-shadow: 
            0 8px 25px ${themeColors.shadowStrong}, 
            0 0 20px ${themeColors.shadow};
        }

        .page-btn.active {
          background: ${themeColors.gradient};
          border-color: ${themeColors.primary};
          color: #ffffff;
          transform: scale(1.1);
          box-shadow: 
            0 8px 25px ${themeColors.shadowActive}, 
            0 0 25px ${themeColors.shadowStrong};
          text-shadow: 0 0 10px rgba(0, 0, 0, 0.8);
        }

        .page-btn.active:hover {
          transform: scale(1.15);
        }

        @media (max-width: 768px) {
          .pagination {
            flex-direction: column;
            gap: 20px;
            padding: 20px;
            border-radius: 25px;
          }

          .page-numbers {
            order: -1;
          }

          .pagination-btn {
            padding: 12px 25px;
            font-size: 0.8rem;
          }
        }

        @media (max-width: 480px) {
          .pagination {
            padding: 15px;
          }

          .page-btn {
            width: 40px;
            height: 40px;
            font-size: 0.9rem;
          }

          .pagination-btn {
            padding: 10px 20px;
            font-size: 0.75rem;
          }
        }
      `}</style>
    </>
  )
} 