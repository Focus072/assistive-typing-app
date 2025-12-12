import type { DocumentFormat } from "@/types"

export interface FormatConfig {
  name: string
  description: string
  fontFamily: string
  fontSize: number // in points
  lineSpacing: number // multiplier (1.0 = single, 2.0 = double)
  margins: {
    top: number // in inches
    right: number
    bottom: number
    left: number
  }
  firstLineIndent: number // in inches (0 = no indent)
  header?: {
    content: string
    alignment: "LEFT" | "CENTER" | "RIGHT"
  }
  titlePage?: boolean
  pageNumbers?: {
    position: "TOP_RIGHT" | "TOP_CENTER" | "BOTTOM_CENTER" | "BOTTOM_RIGHT"
    startFrom: number
  }
}

export const formatConfigs: Record<DocumentFormat, FormatConfig> = {
  none: {
    name: "No Formatting",
    description: "Plain text, no formatting",
    fontFamily: "Arial",
    fontSize: 11,
    lineSpacing: 1.0,
    margins: { top: 1, right: 1, bottom: 1, left: 1 },
    firstLineIndent: 0,
  },
  mla: {
    name: "MLA Format",
    description: "Modern Language Association (9th edition)",
    fontFamily: "Times New Roman",
    fontSize: 12,
    lineSpacing: 2.0, // Double-spaced
    margins: { top: 1, right: 1, bottom: 1, left: 1 },
    firstLineIndent: 0.5, // Half-inch indent for paragraphs
    header: {
      content: "Last Name {page}",
      alignment: "RIGHT",
    },
    pageNumbers: {
      position: "TOP_RIGHT",
      startFrom: 1,
    },
  },
  apa: {
    name: "APA Format",
    description: "American Psychological Association (7th edition)",
    fontFamily: "Times New Roman",
    fontSize: 12,
    lineSpacing: 2.0, // Double-spaced
    margins: { top: 1, right: 1, bottom: 1, left: 1 },
    firstLineIndent: 0.5, // Half-inch indent
    titlePage: true,
    pageNumbers: {
      position: "TOP_RIGHT",
      startFrom: 1,
    },
  },
  chicago: {
    name: "Chicago Style",
    description: "Chicago Manual of Style (17th edition)",
    fontFamily: "Times New Roman",
    fontSize: 12,
    lineSpacing: 2.0,
    margins: { top: 1, right: 1.25, bottom: 1, left: 1.25 },
    firstLineIndent: 0.5,
    pageNumbers: {
      position: "BOTTOM_CENTER",
      startFrom: 1,
    },
  },
  harvard: {
    name: "Harvard Style",
    description: "Harvard referencing format",
    fontFamily: "Times New Roman",
    fontSize: 12,
    lineSpacing: 2.0,
    margins: { top: 1, right: 1, bottom: 1, left: 1.5 },
    firstLineIndent: 0,
    pageNumbers: {
      position: "TOP_RIGHT",
      startFrom: 1,
    },
  },
  ieee: {
    name: "IEEE Format",
    description: "Institute of Electrical and Electronics Engineers",
    fontFamily: "Times New Roman",
    fontSize: 10,
    lineSpacing: 1.5,
    margins: { top: 0.75, right: 0.75, bottom: 0.75, left: 0.75 },
    firstLineIndent: 0,
    pageNumbers: {
      position: "TOP_CENTER",
      startFrom: 1,
    },
  },
  custom: {
    name: "Custom Format",
    description: "Customize your own formatting",
    fontFamily: "Times New Roman",
    fontSize: 12,
    lineSpacing: 2.0,
    margins: { top: 1, right: 1, bottom: 1, left: 1 },
    firstLineIndent: 0.5,
  },
}

/**
 * Convert inches to points (1 inch = 72 points)
 */
function inchesToPoints(inches: number): number {
  return inches * 72
}

/**
 * Generate Google Docs API requests to apply formatting
 */
export function generateFormatRequests(
  format: DocumentFormat,
  documentId: string
): any[] {
  const config = formatConfigs[format]
  const requests: any[] = []

  // Set document margins (in points) - apply to entire document
  requests.push({
    updateDocumentStyle: {
      documentStyle: {
        marginTop: {
          magnitude: inchesToPoints(config.margins.top),
          unit: "PT",
        },
        marginBottom: {
          magnitude: inchesToPoints(config.margins.bottom),
          unit: "PT",
        },
        marginLeft: {
          magnitude: inchesToPoints(config.margins.left),
          unit: "PT",
        },
        marginRight: {
          magnitude: inchesToPoints(config.margins.right),
          unit: "PT",
        },
      },
      fields: "marginTop,marginBottom,marginLeft,marginRight",
    },
  })

  // Get document length first (we'll need to apply styles to all content)
  // For now, apply to a range that will cover initial content
  // The range will be updated when text is inserted
  
  // Insert a placeholder character to set default styles
  // We'll delete it after applying formatting
  requests.push({
    insertText: {
      location: {
        index: 1,
      },
      text: " ",
    },
  })

  // Set default paragraph style for the document body
  requests.push({
    updateParagraphStyle: {
      paragraphStyle: {
        lineSpacing: config.lineSpacing * 100, // Percentage (200 = double-spaced)
        spaceAbove: {
          magnitude: 0,
          unit: "PT",
        },
        spaceBelow: {
          magnitude: 0,
          unit: "PT",
        },
        firstLineIndent: {
          magnitude: inchesToPoints(config.firstLineIndent),
          unit: "PT",
        },
      },
      range: {
        startIndex: 1,
        endIndex: 2,
      },
      fields: "lineSpacing,spaceAbove,spaceBelow,firstLineIndent",
    },
  })

  // Set default text style (font family and size) for the document
  requests.push({
    updateTextStyle: {
      textStyle: {
        fontSize: {
          magnitude: config.fontSize,
          unit: "PT",
        },
        weightedFontFamily: {
          fontFamily: config.fontFamily,
        },
      },
      range: {
        startIndex: 1,
        endIndex: 2,
      },
      fields: "fontSize,weightedFontFamily",
    },
  })

  // Delete the placeholder character
  requests.push({
    deleteContentRange: {
      range: {
        startIndex: 1,
        endIndex: 2,
      },
    },
  })

  // Note: Headers and page numbers are complex and require section breaks
  // For now, we'll apply basic formatting. Users can add headers manually in Google Docs
  // The formatting will be applied to all text that gets typed

  return requests
}

