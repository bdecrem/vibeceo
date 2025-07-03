"use client"

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  hasNextPage: boolean
  hasPreviousPage: boolean
  totalCount: number
  limit: number
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  hasNextPage,
  hasPreviousPage,
  totalCount,
  limit
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

  return (
    <>
      <div className="pagination-container">
        <div className="pagination-info">
          Showing {startItem}-{endItem} of {totalCount} total
        </div>
        
        <div className="pagination-controls">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!hasPreviousPage}
            className="pagination-btn prev-btn"
          >
            ← Previous
          </button>
          
          <div className="page-numbers">
            {getPageNumbers().map((page) => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`page-btn ${page === currentPage ? 'active' : ''}`}
              >
                {page}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!hasNextPage}
            className="pagination-btn next-btn"
          >
            Next →
          </button>
        </div>
      </div>

      <style jsx>{`
        .pagination-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          margin: 40px 0;
          padding: 30px;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(15px);
          border: 2px solid rgba(255, 102, 0, 0.3);
          border-radius: 20px;
          box-shadow: 
            0 12px 40px rgba(0, 0, 0, 0.4),
            inset 0 0 20px rgba(255, 102, 0, 0.1);
        }

        .pagination-info {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.7);
          text-align: center;
          letter-spacing: 1px;
        }

        .pagination-controls {
          display: flex;
          align-items: center;
          gap: 15px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .pagination-btn {
          padding: 12px 20px;
          background: rgba(0, 0, 0, 0.7);
          border: 2px solid #ff3366;
          color: #ff3366;
          border-radius: 10px;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .pagination-btn:hover:not(:disabled) {
          background: rgba(255, 51, 102, 0.1);
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(255, 51, 102, 0.3);
        }

        .pagination-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
          transform: none;
        }

        .page-numbers {
          display: flex;
          gap: 8px;
        }

        .page-btn {
          padding: 10px 15px;
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: rgba(255, 255, 255, 0.7);
          border-radius: 8px;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          min-width: 40px;
        }

        .page-btn:hover {
          background: rgba(255, 102, 0, 0.1);
          border-color: #ff6600;
          color: #ff6600;
          transform: translateY(-1px);
        }

        .page-btn.active {
          background: linear-gradient(45deg, #ff6600, #ff3366);
          border-color: #ff6600;
          color: #ffffff;
          font-weight: 700;
          box-shadow: 0 0 15px rgba(255, 102, 0, 0.5);
        }

        @media (max-width: 768px) {
          .pagination-container {
            padding: 20px;
            margin: 30px 0;
          }
          
          .pagination-controls {
            flex-direction: column;
            gap: 15px;
          }
          
          .pagination-btn {
            padding: 10px 18px;
            font-size: 0.8rem;
          }
          
          .page-btn {
            padding: 8px 12px;
            min-width: 35px;
          }
        }

        @media (max-width: 480px) {
          .page-numbers {
            gap: 5px;
          }
          
          .page-btn {
            padding: 6px 10px;
            min-width: 30px;
            font-size: 0.8rem;
          }
        }
      `}</style>
    </>
  )
} 