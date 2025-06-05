// Box type display names and utilities

export const getBoxTypeDisplayName = (boxType, useShort = false) => {
  const displayNames = {
    'EL': useShort ? 'Early Learn.' : 'Early Learning',
    'Kids': 'Kids',
    'Teens': 'Teens'
  };
  
  return displayNames[boxType] || boxType;
};

export const getBoxTypeShortName = (boxType) => {
  const shortNames = {
    'EL': 'EL',
    'Kids': 'Kids',
    'Teens': 'Teens'
  };
  
  return shortNames[boxType] || boxType;
};

export const BOX_TYPE_COLORS = {
  'EL': '#4CAF50',
  'Kids': '#2196F3', 
  'Teens': '#FF9800'
};