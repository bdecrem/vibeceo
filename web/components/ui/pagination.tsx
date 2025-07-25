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
        /* WEBTOYS Design System Colors */
        :root {
          --cream: #FEFEF5;
          --yellow: #FFD63D;
          --yellow-soft: #FFF4CC;
          --blue: #6ECBFF;
          --blue-deep: #4A9FD4;
          --red: #FF4B4B;
          --red-soft: #FF7A7A;
          --purple-shadow: #C9C2F940;
          --purple-accent: #8B7FD4;
          --green-mint: #B6FFB3;
          --green-sage: #7FB069;
          --charcoal: #2A2A2A;
          --gray-warm: #6B6B6B;
          --white-pure: #FFFFFF;
          --black-soft: #1A1A1A;
        }

        .pagination-section {
          margin-top: 4rem;
          margin-bottom: 3rem;
          display: flex;
          justify-content: center;
        }

        .pagination {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: var(--white-pure);
          border: 6px solid var(--yellow);
          border-radius: 4rem;
          padding: 1.5rem 2.5rem;
          box-shadow: 0 12px 0 var(--purple-accent), 0 24px 60px var(--purple-shadow);
          animation: float-gentle 6s ease-in-out infinite;
        }

        @keyframes float-gentle {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }

        .pagination-btn {
          padding: 0.75rem 2rem;
          background: var(--cream);
          border: 4px solid var(--charcoal);
          color: var(--charcoal);
          border-radius: 2rem;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-weight: 800;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: -0.5px;
          box-shadow: 0 4px 0 var(--gray-warm);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .pagination-btn:hover:not(.disabled) {
          background: var(--blue);
          color: var(--white-pure);
          transform: translateY(-3px);
          box-shadow: 0 7px 0 var(--blue-deep);
        }

        .pagination-btn:active:not(.disabled) {
          transform: translateY(0);
          box-shadow: 0 2px 0 var(--blue-deep);
        }

        .pagination-btn.disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: var(--gray-warm);
          color: var(--white-pure);
          border-color: var(--gray-warm);
          box-shadow: 0 4px 0 #4A4A4A;
        }

        .page-numbers {
          display: flex;
          gap: 0.5rem;
        }

        .page-btn {
          width: 50px;
          height: 50px;
          background: var(--white-pure);
          border: 4px solid var(--charcoal);
          color: var(--charcoal);
          border-radius: 50%;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-weight: 900;
          font-size: 1.1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 0 var(--gray-warm);
          position: relative;
        }

        .page-btn:hover {
          background: var(--yellow-soft);
          transform: translateY(-2px) scale(1.05);
          box-shadow: 0 6px 0 var(--yellow);
        }

        .page-btn.active {
          background: var(--red);
          border-color: var(--charcoal);
          color: var(--white-pure);
          transform: scale(1.1);
          box-shadow: 0 6px 0 var(--red-soft);
          animation: pulse-active 2s ease-in-out infinite;
        }

        @keyframes pulse-active {
          0%, 100% { 
            box-shadow: 0 6px 0 var(--red-soft), 0 0 0 rgba(255, 75, 75, 0.3);
          }
          50% { 
            box-shadow: 0 6px 0 var(--red-soft), 0 0 20px rgba(255, 75, 75, 0.6);
          }
        }

        .page-btn.active:hover {
          transform: scale(1.15);
          background: var(--red-soft);
        }

        @media (max-width: 768px) {
          .pagination {
            flex-direction: column;
            gap: 1.5rem;
            padding: 1.5rem;
            border-radius: 2rem;
            box-shadow: 0 8px 0 var(--purple-accent), 0 16px 40px var(--purple-shadow);
          }

          .page-numbers {
            order: -1;
          }

          .pagination-btn {
            padding: 0.75rem 1.5rem;
            font-size: 0.9rem;
          }
        }

        @media (max-width: 480px) {
          .pagination {
            padding: 1rem;
            gap: 1rem;
          }

          .page-btn {
            width: 45px;
            height: 45px;
            font-size: 1rem;
          }

          .pagination-btn {
            padding: 0.6rem 1.2rem;
            font-size: 0.8rem;
          }

          .page-numbers {
            gap: 0.3rem;
          }
        }
      `}</style>
    </>
  )
} 