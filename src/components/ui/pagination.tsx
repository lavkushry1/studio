'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    siblings?: number; // Number of page links shown around the current page
}

export function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    siblings = 1, // Show 1 page link before and after current page by default
}: PaginationProps) {

    const getPageNumbers = () => {
        const totalNumbers = siblings * 2 + 3; // siblings + first + last + current
        const totalBlocks = totalNumbers + 2; // Add ellipsis blocks

        if (totalPages <= totalBlocks) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        const leftSiblingIndex = Math.max(currentPage - siblings, 1);
        const rightSiblingIndex = Math.min(currentPage + siblings, totalPages);

        const shouldShowLeftDots = leftSiblingIndex > 2;
        const shouldShowRightDots = rightSiblingIndex < totalPages - 1;

        const firstPageIndex = 1;
        const lastPageIndex = totalPages;

        if (!shouldShowLeftDots && shouldShowRightDots) {
            const leftItemCount = 3 + 2 * siblings;
            const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
            return [...leftRange, '...', lastPageIndex];
        }

        if (shouldShowLeftDots && !shouldShowRightDots) {
            const rightItemCount = 3 + 2 * siblings;
            const rightRange = Array.from({ length: rightItemCount }, (_, i) => lastPageIndex - rightItemCount + i + 1);
            return [firstPageIndex, '...', ...rightRange];
        }

        if (shouldShowLeftDots && shouldShowRightDots) {
             const middleRange = Array.from({ length: rightSiblingIndex - leftSiblingIndex + 1 }, (_, i) => leftSiblingIndex + i);
            return [firstPageIndex, '...', ...middleRange, '...', lastPageIndex];
        }

        // Fallback (should not happen with logic above but included for safety)
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    };

    const pageNumbers = getPageNumbers();

    const handlePrevious = () => {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    };

    const handleNext = () => {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
        }
    };

    if (totalPages <= 1) {
        return null; // Don't render pagination if only one page
    }


    return (
        <nav aria-label="Pagination" className="flex items-center justify-center space-x-2">
            <Button
                variant="outline"
                size="icon"
                onClick={handlePrevious}
                disabled={currentPage === 1}
                aria-label="Go to previous page"
                className="h-9 w-9"
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>

            {pageNumbers.map((page, index) => (
                <React.Fragment key={index}>
                    {page === '...' ? (
                        <span className="flex h-9 w-9 items-center justify-center">
                            <MoreHorizontal className="h-4 w-4" />
                        </span>
                    ) : (
                        <Button
                            variant={currentPage === page ? 'default' : 'outline'}
                            size="icon"
                            onClick={() => onPageChange(page as number)}
                            aria-current={currentPage === page ? 'page' : undefined}
                            className="h-9 w-9"
                        >
                            {page}
                        </Button>
                    )}
                </React.Fragment>
            ))}

            <Button
                variant="outline"
                size="icon"
                onClick={handleNext}
                disabled={currentPage === totalPages}
                aria-label="Go to next page"
                className="h-9 w-9"
            >
                <ChevronRight className="h-4 w-4" />
            </Button>
        </nav>
    );
}
