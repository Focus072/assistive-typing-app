import type { DocumentFormat } from "@/types"
import type { FormatMetadata } from "@/components/FormatMetadataModal"
import type { CustomFormatConfig } from "@/components/CustomFormatModal"

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
  documentId: string,
  metadata?: FormatMetadata,
  customConfig?: CustomFormatConfig
): any[] {
  // Use custom config if format is custom, otherwise use default config
  const config = format === "custom" && customConfig
    ? { ...formatConfigs[format], ...customConfig }
    : formatConfigs[format]
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

  // Note: Headers need to be created after document creation when we have the document structure
  // This will be handled in a separate function that gets called after document creation

  // Insert header content based on format and metadata
  if (metadata) {
    let headerText = ""
    let insertIndex = 1

    switch (format) {
      case "mla":
        // MLA format: Name, Professor, Course, Date, Title (each on new line, left-aligned)
        if (metadata.studentName && metadata.professorName && metadata.courseName && metadata.date) {
          let mlaHeader = `${metadata.studentName}\n${metadata.professorName}\n${metadata.courseName}\n${metadata.date}\n`
          if (metadata.title) {
            mlaHeader += `\n${metadata.title}\n`
          }
          headerText = mlaHeader + `\n`
        }
        break
      
      case "apa":
        // APA format: Title page with running head, title (centered, bolded), name, institution, course, professor, date
        // All centered and double-spaced
        if (metadata.title && metadata.studentName && metadata.institution && metadata.courseName && metadata.professorName && metadata.date) {
          // Build title page content (centered, double-spaced)
          // Running head will be added separately in formatting
          headerText = `${metadata.title}\n\n${metadata.studentName}\n${metadata.institution}\n${metadata.courseName}\n${metadata.professorName}\n${metadata.date}\n\n`
        }
        break
      
      case "chicago":
      case "harvard":
      case "ieee":
      case "custom":
        // Similar to MLA for most formats
        if (metadata.studentName && metadata.professorName && metadata.courseName && metadata.date) {
          headerText = `${metadata.studentName}\n${metadata.professorName}\n${metadata.courseName}\n${metadata.date}\n\n`
        }
        break
    }

    if (headerText) {
      let currentInsertIndex = insertIndex
      
      // For APA, add running head first if provided
      if (format === "apa" && metadata.runningHead) {
        const runningHeadText = `Running head: ${metadata.runningHead.toUpperCase()}`
        const pageNumText = "1"
        const runningHeadLine = runningHeadText + "\t\t" + pageNumText + "\n"
        
        // Insert running head at the beginning
        requests.push({
          insertText: {
            location: {
              index: currentInsertIndex,
            },
            text: runningHeadLine,
          },
        })

        // Format running head: left-aligned
        const runningHeadEndIndex = currentInsertIndex + runningHeadLine.length
        requests.push({
          updateParagraphStyle: {
            paragraphStyle: {
              alignment: "START",
            },
            range: {
              startIndex: currentInsertIndex,
              endIndex: runningHeadEndIndex,
            },
            fields: "alignment",
          },
        })

        // Update insert index for title page content
        currentInsertIndex = runningHeadEndIndex
      }

      // Insert title page content
      requests.push({
        insertText: {
          location: {
            index: currentInsertIndex,
          },
          text: headerText,
        },
      })

      const headerEndIndex = currentInsertIndex + headerText.length
      const documentEndIndex = headerEndIndex

      // Apply formatting to all inserted content (this sets the style for the document)
      // Set paragraph style (line spacing, indentation)
      const paragraphStyle: any = {
        spaceAbove: {
          magnitude: 0,
          unit: "PT",
        },
        spaceBelow: {
          magnitude: 0,
          unit: "PT",
        },
      }

      if (config.lineSpacing !== 1.0) {
        paragraphStyle.lineSpacing = config.lineSpacing
      }

      if (config.firstLineIndent > 0) {
        paragraphStyle.indentFirstLine = {
          magnitude: inchesToPoints(config.firstLineIndent),
          unit: "PT",
        }
      }

      const paragraphFields = ["spaceAbove", "spaceBelow"]
      if (config.lineSpacing !== 1.0) {
        paragraphFields.push("lineSpacing")
      }
      if (config.firstLineIndent > 0) {
        paragraphFields.push("indentFirstLine")
      }

      // Apply paragraph formatting to all content
      requests.push({
        updateParagraphStyle: {
          paragraphStyle,
          range: {
            startIndex: currentInsertIndex,
            endIndex: documentEndIndex,
          },
          fields: paragraphFields.join(","),
        },
      })

      // Apply text formatting (font family and size) to all content
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
            startIndex: currentInsertIndex,
            endIndex: documentEndIndex,
          },
          fields: "fontSize,weightedFontFamily",
        },
      })

      if (format === "apa") {
        // APA-specific formatting: Title centered and bolded, author info centered
        const titleStartIndex = currentInsertIndex
        const titleEndIndex = titleStartIndex + metadata.title!.length
        
        // Bold and center the title
        requests.push({
          updateTextStyle: {
            textStyle: {
              bold: true,
            },
            range: {
              startIndex: titleStartIndex,
              endIndex: titleEndIndex,
            },
            fields: "bold",
          },
        })

        requests.push({
          updateParagraphStyle: {
            paragraphStyle: {
              alignment: "CENTER",
            },
            range: {
              startIndex: titleStartIndex,
              endIndex: titleEndIndex,
            },
            fields: "alignment",
          },
        })

        // Center all author information (everything after title)
        const authorStartIndex = titleEndIndex + 2 // +2 for \n\n
        requests.push({
          updateParagraphStyle: {
            paragraphStyle: {
              alignment: "CENTER",
            },
            range: {
              startIndex: authorStartIndex,
              endIndex: headerEndIndex,
            },
            fields: "alignment",
          },
        })
      } else if (format === "mla") {
        // MLA format: Name, Professor, Course, Date left-aligned, Title centered
        // Calculate where the title starts
        const namePart = `${metadata.studentName}\n${metadata.professorName}\n${metadata.courseName}\n${metadata.date}\n`
        const titleStartIndex = currentInsertIndex + namePart.length + 1 // +1 for the extra \n before title
        const titleEndIndex = metadata.title ? titleStartIndex + metadata.title.length : titleStartIndex
        
        // Left-align name, professor, course, date
        requests.push({
          updateParagraphStyle: {
            paragraphStyle: {
              alignment: "START", // Left align
              indentFirstLine: {
                magnitude: 0,
                unit: "PT",
              },
            },
            range: {
              startIndex: currentInsertIndex,
              endIndex: titleStartIndex,
            },
            fields: "alignment,indentFirstLine",
          },
        })
        
        // Center the title if it exists
        if (metadata.title) {
          requests.push({
            updateParagraphStyle: {
              paragraphStyle: {
                alignment: "CENTER",
                indentFirstLine: {
                  magnitude: 0,
                  unit: "PT",
                },
              },
              range: {
                startIndex: titleStartIndex,
                endIndex: titleEndIndex + 1, // +1 for the \n after title
              },
              fields: "alignment,indentFirstLine",
            },
          })
          
          // Left-align everything after title (the blank line and body text)
          if (titleEndIndex + 1 < headerEndIndex) {
            requests.push({
              updateParagraphStyle: {
                paragraphStyle: {
                  alignment: "START",
                  indentFirstLine: {
                    magnitude: 0,
                    unit: "PT",
                  },
                },
                range: {
                  startIndex: titleEndIndex + 1,
                  endIndex: headerEndIndex,
                },
                fields: "alignment,indentFirstLine",
              },
            })
          }
        } else {
          // No title, just left-align everything
          requests.push({
            updateParagraphStyle: {
              paragraphStyle: {
                alignment: "START",
                indentFirstLine: {
                  magnitude: 0,
                  unit: "PT",
                },
              },
              range: {
                startIndex: currentInsertIndex,
                endIndex: headerEndIndex,
              },
              fields: "alignment,indentFirstLine",
            },
          })
        }
      } else {
        // Other formats: left-aligned, no indent
        requests.push({
          updateParagraphStyle: {
            paragraphStyle: {
              alignment: "START", // Left align
              indentFirstLine: {
                magnitude: 0,
                unit: "PT",
              },
            },
            range: {
              startIndex: currentInsertIndex,
              endIndex: headerEndIndex,
            },
            fields: "alignment,indentFirstLine",
          },
        })
      }
    }
  }

  return requests
}

