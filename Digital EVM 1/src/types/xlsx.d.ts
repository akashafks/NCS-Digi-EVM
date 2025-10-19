declare module 'xlsx' {
  export const utils: {
    json_to_sheet: (data: any[]) => any;
    book_new: () => any;
    book_append_sheet: (workbook: any, worksheet: any, name: string) => void;
  };
  export const writeFile: (workbook: any, filename: string) => void;
} 