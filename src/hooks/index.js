import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

const TAB_BAR_BOTTOM_OFFSET = 16;
const TAB_BAR_CONTENT_GAP = 20;

export const useTabBarContentPadding = () => (
	useBottomTabBarHeight() + TAB_BAR_BOTTOM_OFFSET + TAB_BAR_CONTENT_GAP
);
