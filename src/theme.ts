import type { ThemeConfig } from 'antd'

// antd follows the same "ballpoint ink on paper" palette as the Tailwind tokens in index.css.
export const theme: ThemeConfig = {
  token: {
    colorPrimary: '#1B2A6B',
    colorText: '#1B2A6B',
    colorTextSecondary: '#3A4675',
    colorTextTertiary: '#4E5880',
    colorTextPlaceholder: '#7A83A6',
    colorError: '#B3261E',
    colorSuccess: '#1E7B4A',
    colorBorder: 'rgba(27, 42, 107, 0.32)',
    colorSplit: 'rgba(27, 42, 107, 0.16)',
    fontFamily: "'Inter Variable', 'Helvetica Neue', Helvetica, Arial, sans-serif",
    fontSize: 16,
    borderRadius: 10,
    controlHeight: 44,
    controlHeightLG: 56,
    motionEaseOut: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  },
  components: {
    Button: {
      fontWeight: 650,
      primaryShadow: 'none',
      defaultShadow: 'none',
      contentFontSizeLG: 17,
    },
    Collapse: {
      headerPadding: '16px 0',
      contentPadding: '0 0 24px',
    },
    Drawer: {
      colorBgElevated: '#EEF2F4',
    },
  },
}
