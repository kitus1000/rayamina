import { useWindowDimensions } from 'react-native'

export interface ResponsiveLayout {
    width: number
    height: number
    isCompact: boolean
    isTablet: boolean
    isLandscape: boolean
    horizontalPadding: number
    columns: number
    modalMaxWidth: number
    drawerWidth: number
    fontScaleFactor: number
    cardWidth: (gap?: number, cols?: number) => number
}

/**
 * Computes reactive dimensions and breakpoint helpers for any Android phone or tablet screen.
 */
export function useResponsiveLayout(): ResponsiveLayout {
    const { width, height } = useWindowDimensions()
    const isCompact = width < 360
    const isTablet = width >= 600
    const isLandscape = width > height
    const horizontalPadding = isCompact ? 10 : isTablet ? 20 : 14
    const columns = isTablet ? (width >= 900 ? 4 : 3) : 2
    const modalMaxWidth = isTablet ? Math.min(540, width * 0.86) : Math.max(280, width - 24)
    const drawerWidth = isTablet ? Math.min(360, width * 0.55) : Math.min(315, width * 0.84)
    const fontScaleFactor = isCompact ? 0.9 : isTablet ? 1.06 : 1

    const cardWidth = (gap = 10, cols = columns) => {
        const usable = Math.max(220, width - horizontalPadding * 2 - gap * (cols - 1))
        return Math.floor(usable / cols)
    }

    return {
        width,
        height,
        isCompact,
        isTablet,
        isLandscape,
        horizontalPadding,
        columns,
        modalMaxWidth,
        drawerWidth,
        fontScaleFactor,
        cardWidth,
    }
}
