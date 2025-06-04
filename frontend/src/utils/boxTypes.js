// Box type display names and utilities

export const getBoxTypeDisplayName = (boxType) => {
  const displayNames = {
    'EL': 'Early Learning',
    'Kids': 'Kids',
    'Teens': 'Teens'
  };
  
  return displayNames[boxType] || boxType;
};

export const BOX_TYPE_COLORS = {
  'EL': '#4CAF50',
  'Kids': '#2196F3', 
  'Teens': '#FF9800'
};