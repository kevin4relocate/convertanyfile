export interface FormatSeoContent {
  description: string;
  summary: string;
  exampleFrom: string;
  exampleTo: string;
  sections: readonly { heading: string; paragraph: string }[];
  faq: readonly { question: string; answer: string }[];
  related: readonly string[];
}

export const FORMAT_SEO_CONTENT: Record<string, FormatSeoContent> = {
  "markdown-html": {
    "description": "Convert Markdown to HTML or turn simple HTML back into Markdown locally. Learn which headings, lists, links and formatting survive each direction.",
    "summary": "Markdown is convenient for editing text, while HTML provides elements a web page can render. Use this converter when you need a quick article snippet, README section or simple page fragment rather than a complete website export.",
    "exampleFrom": "# Setup\n\nInstall the **package**.",
    "exampleTo": "<h1>Setup</h1>\n<p>Install the <strong>package</strong>.</p>",
    "sections": [
      {
        "heading": "Choose the right direction",
        "paragraph": "Markdown → HTML produces heading, paragraph and basic list markup that can be pasted into an editor accepting HTML. HTML → Markdown is best for common text elements, not arbitrary web pages. Check lists, links and code carefully if your input contains custom styling or embeds."
      },
      {
        "heading": "Watch formatting fidelity",
        "paragraph": "Rich HTML attributes, layout grids, interactive elements and CSS rules have no direct Markdown equivalent. For example, converting an HTML table or a styled button into Markdown cannot recreate all of its original appearance. Keep the source when exact styling matters."
      },
      {
        "heading": "Verify the exported content",
        "paragraph": "Compare the text, headings and ordered reading flow against the original. Open the HTML in a trusted preview or paste the Markdown into the destination renderer. Never treat conversion as a substitute for sanitizing untrusted HTML before displaying it publicly."
      }
    ],
    "faq": [
      {
        "question": "Does HTML → Markdown preserve CSS?",
        "answer": "No. The reverse converter focuses on basic semantic text and cannot retain a complete page layout or CSS."
      },
      {
        "question": "Can I use the output in a CMS?",
        "answer": "For simple content, yes, provided the CMS supports the target syntax. Preview links, headings and line breaks before publishing."
      }
    ],
    "related": [
      "html-plain-text",
      "csv-html-table"
    ]
  },
  "html-plain-text": {
    "description": "Strip HTML tags to readable plain text, or wrap plain text as escaped HTML. Find out why layout, links and styles are not reversible.",
    "summary": "HTML contains content and markup. Plain text keeps readable words but does not retain a link's destination, image, class or CSS layout. Reverse conversion simply wraps escaped text in a preformatted element; it does not invent semantic headings or paragraphs.",
    "exampleFrom": "<h1>Notes</h1><p>Hello <strong>team</strong>.</p>",
    "exampleTo": "Notes\nHello team.",
    "sections": [
      {
        "heading": "Extract text without scripts",
        "paragraph": "When copying a simple HTML email or a snippet into a note, converting to plain text removes presentation tags and excludes script and style elements. Paragraphs and line breaks are translated where supported, but the precise spacing may differ from the original browser layout."
      },
      {
        "heading": "Understand the reverse direction",
        "paragraph": "Plain Text → HTML is for safely representing literal characters as preformatted text. Angle brackets are escaped rather than interpreted as markup. It is useful for showing a code excerpt on a page, not for automatically generating a styled article."
      },
      {
        "heading": "Check the output where it will be used",
        "paragraph": "Review lists, tables, image descriptions and anchors manually. These often carry meaning beyond visible text, so a plain-text copy can be incomplete. If you need actual Markdown headings instead, use the Markdown/HTML converter and review the structure."
      }
    ],
    "faq": [
      {
        "question": "Will plain text retain clickable links?",
        "answer": "Usually only visible anchor text remains; the original link URL is not preserved as a separate field."
      },
      {
        "question": "Does text → HTML create an article?",
        "answer": "No. It encodes the text inside a preformatted block to preserve literal content and line breaks."
      }
    ],
    "related": [
      "markdown-html",
      "csv-html-table"
    ]
  },
  "csv-html-table": {
    "description": "Turn a CSV table into escaped HTML table markup, or extract rectangular HTML tables to CSV. Covers quotes, headers and merged-cell limits.",
    "summary": "CSV is easy to import into spreadsheets; HTML tables are convenient for displaying simple records on a page. This converter uses the first CSV row as table headers and supports correctly quoted commas and line breaks.",
    "exampleFrom": "Name,City\nAlice,Hanoi\nBob,Tokyo",
    "exampleTo": "<table>\n  <thead><tr><th>Name</th><th>City</th></tr></thead>\n  <tbody><tr><td>Alice</td><td>Hanoi</td></tr><tr><td>Bob</td><td>Tokyo</td></tr></tbody>\n</table>",
    "sections": [
      {
        "heading": "Create a display table",
        "paragraph": "CSV → HTML Table escapes cell values so text such as an angle bracket appears as text, not as executable markup. Use it for simple comparison tables, catalog extracts or documentation, then add styling in your website separately."
      },
      {
        "heading": "Import only simple HTML tables",
        "paragraph": "HTML Table → CSV expects one table with equal-width rows. It rejects merged cells with rowspan or colspan because a flat CSV cannot express their geometry reliably. Nested visual layouts and multiple tables should be edited before conversion."
      },
      {
        "heading": "Check spreadsheet compatibility",
        "paragraph": "A CSV field may contain a comma, quote or a line break. Open the exported CSV with an appropriate import option and confirm row count, column count and quoting. Treat identifiers like 001 as text to avoid losing leading zeros in a spreadsheet."
      }
    ],
    "faq": [
      {
        "question": "Are commas inside quoted CSV cells supported?",
        "answer": "Yes. Quoted commas, doubled quotes and embedded line breaks are parsed as data."
      },
      {
        "question": "Can it convert tables with merged cells?",
        "answer": "No. Rowspan and colspan are rejected rather than silently flattening the table."
      }
    ],
    "related": [
      "xml-csv",
      "json-yaml"
    ]
  },
  "ini-json": {
    "description": "Convert flat INI sections into JSON or simple JSON objects into INI. Understand string values, sections, duplicate keys and unsupported nesting.",
    "summary": "INI is convenient for simple settings files, while JSON makes key/value data easier to consume in scripts. INI usually stores values as text, so converting it to JSON does not automatically turn 8080 into a number or true into a Boolean.",
    "exampleFrom": "[server]\nhost=localhost\nport=8080",
    "exampleTo": "{\n  \"server\": {\n    \"host\": \"localhost\",\n    \"port\": \"8080\"\n  }\n}",
    "sections": [
      {
        "heading": "Preserve configuration meaning",
        "paragraph": "INI → JSON turns section names into object keys. Check your application's expected types after exporting: a port written as 8080 in INI is represented as a string, which may need explicit conversion in the destination application."
      },
      {
        "heading": "Limit reverse conversion to simple settings",
        "paragraph": "JSON → INI supports root scalar keys and one level of object sections, not arbitrary nested JSON. Multiline values, arrays, nulls and complex structures are rejected. Use JSON or YAML instead when your configuration needs repeated structured objects."
      },
      {
        "heading": "Compare values before deployment",
        "paragraph": "Before replacing a production configuration, diff the generated file against the original. Check section headings, file encoding, empty values, comments and case-sensitive keys: conversion can change how a consuming program interprets them."
      }
    ],
    "faq": [
      {
        "question": "Are INI comments preserved?",
        "answer": "No. The converter extracts data rather than round-tripping comment placement and formatting."
      },
      {
        "question": "Does 8080 remain a JSON number?",
        "answer": "No. Values originating from INI are represented as strings to avoid guessing their types."
      }
    ],
    "related": [
      "json-yaml",
      "json-toml"
    ]
  },
  "json-yaml": {
    "description": "Convert flat JSON objects to YAML or simple YAML mappings back to JSON in your browser. Find limits on arrays, tags, anchors and nesting.",
    "summary": "JSON is strict and common in APIs; YAML is often easier to read in configuration files. This converter intentionally handles a small scalar-object subset, so it is useful for short configuration examples rather than complex deployment manifests.",
    "exampleFrom": "{\"service\":\"web\",\"enabled\":true,\"retries\":3}",
    "exampleTo": "service: \"web\"\nenabled: true\nretries: 3",
    "sections": [
      {
        "heading": "Move basic configuration fields",
        "paragraph": "JSON → YAML works with flat objects containing strings, numbers, Booleans and null. It quotes strings so ambiguous words stay strings. A number or Boolean should still be inspected in the output because the destination's parser may have different expectations."
      },
      {
        "heading": "Respect YAML's richer feature set",
        "paragraph": "YAML → JSON supports simple top-level key/value mappings. Anchors, tags, multiline blocks, sequences and nested mappings are not fully supported. For Kubernetes files or elaborate CI configurations, choose a standards-compliant parser instead of this lightweight editor."
      },
      {
        "heading": "Validate after converting",
        "paragraph": "Paste a representative configuration into the target application or its schema validator. Watch for numeric precision, escaped quotation marks and duplicate keys. Keep a copy of the original and use the direction selector only when the supported structures match."
      }
    ],
    "faq": [
      {
        "question": "Can this convert a nested YAML file?",
        "answer": "No. The lightweight reverse parser rejects nested or indented YAML."
      },
      {
        "question": "Are YAML anchors and aliases preserved?",
        "answer": "No. Anchors, aliases and custom tags are outside this converter's supported subset."
      }
    ],
    "related": [
      "json-toml",
      "yaml-toml"
    ]
  },
  "json-toml": {
    "description": "Convert flat JSON configuration objects to TOML and basic TOML assignments back to JSON. Review limitations on null, arrays and tables.",
    "summary": "TOML is popular for settings in development tools; JSON appears in APIs and machine-readable output. These two formats do not have identical value types, so a restricted flat mapping is safer than guessing how to convert nested structures.",
    "exampleFrom": "{\"package\":\"demo\",\"enabled\":true,\"retries\":3}",
    "exampleTo": "package = \"demo\"\nenabled = true\nretries = 3",
    "sections": [
      {
        "heading": "Convert simple named settings",
        "paragraph": "JSON → TOML writes scalar assignments for strings, numbers and Booleans. TOML has no null value, so a null field cannot be converted without changing meaning and is rejected instead of silently disappearing."
      },
      {
        "heading": "Know what TOML syntax is excluded",
        "paragraph": "The reverse direction accepts simple flat key/value lines. Tables, arrays of tables, date/time values and multiline strings require additional parsing rules not implemented here. A real Cargo or pyproject.toml file may need a more complete tool."
      },
      {
        "heading": "Test the output in context",
        "paragraph": "Do not assume matching keys prove equivalent meaning. Compare expected value types, quote handling and the receiving program's validation. Keep the original configuration and run its parser or tests after making changes."
      }
    ],
    "faq": [
      {
        "question": "What happens to a JSON null?",
        "answer": "Conversion to TOML rejects it because TOML has no equivalent null scalar."
      },
      {
        "question": "Can I convert complex TOML tables?",
        "answer": "Not with this lightweight converter. It is intended for flat assignments only."
      }
    ],
    "related": [
      "yaml-toml",
      "ini-json"
    ]
  },
  "yaml-toml": {
    "description": "Convert simple YAML mappings to TOML assignments, or TOML assignments back to YAML. Explains value types and unsupported nested settings.",
    "summary": "Both YAML and TOML can describe configuration, but their syntax and type systems differ. This tool works for small flat settings blocks such as a flag, a label and a count rather than full application configuration trees.",
    "exampleFrom": "title: Example\nenabled: true\ncount: 3",
    "exampleTo": "title = \"Example\"\nenabled = true\ncount = 3",
    "sections": [
      {
        "heading": "Select a flat configuration block",
        "paragraph": "YAML → TOML accepts simple key/value pairs and recognizes obvious scalar types. YAML lists, aliases and nested maps are intentionally rejected. If your source has indentation that establishes structure, do not remove the indentation just to force a conversion."
      },
      {
        "heading": "Check strings that resemble numbers",
        "paragraph": "Some YAML scalar spellings are ambiguous across parsers, particularly strings resembling dates, numbers or Boolean values. Quotes make the intended type explicit. TOML → YAML similarly targets simple assignments without tables or arrays."
      },
      {
        "heading": "Use a validator before committing",
        "paragraph": "Compare the generated settings against the target tool's documentation. Test the exported file with the actual consuming program and retain the source so the conversion can be reviewed or replaced if it proves incomplete."
      }
    ],
    "faq": [
      {
        "question": "Are YAML lists supported?",
        "answer": "No. This interface supports flat scalar mappings, not lists or nested objects."
      },
      {
        "question": "Does converting YAML to TOML keep comments?",
        "answer": "No. Comments and layout are not guaranteed to round-trip."
      }
    ],
    "related": [
      "json-yaml",
      "json-toml"
    ]
  },
  "xml-csv": {
    "description": "Convert simple XML row elements to CSV, or rectangular CSV into XML row elements. Covers attributes, nesting, headers and escaped text.",
    "summary": "XML can model complex hierarchical documents; CSV is a flat table. This converter is designed for repeated simple records, such as rows containing name and city elements, not arbitrary XML with attributes, namespaces or mixed content.",
    "exampleFrom": "<rows><row><name>Alice</name><city>Hanoi</city></row></rows>",
    "exampleTo": "name,city\nAlice,Hanoi",
    "sections": [
      {
        "heading": "Identify repeating rows",
        "paragraph": "XML → CSV expects one root containing record elements, each with flat child fields. The first set of field names becomes the CSV header. Attributes and nested child structures are rejected because they cannot be represented faithfully as ordinary cells."
      },
      {
        "heading": "Create valid XML field names",
        "paragraph": "CSV → XML uses column headings as element names. Headings with spaces or invalid XML name characters cannot be written as element names and produce an error. Text characters such as ampersands and angle brackets are escaped in the resulting XML."
      },
      {
        "heading": "Count records before import",
        "paragraph": "After conversion, verify that the number of XML records equals the number of CSV data rows. Check empty values, Unicode and escaped characters. When metadata, namespaces or attribute semantics matter, choose a richer mapping approach."
      }
    ],
    "faq": [
      {
        "question": "Can I convert arbitrary XML documents?",
        "answer": "No. XML hierarchies and attributes cannot be flattened without a mapping rule; this tool supports flat repeated records only."
      },
      {
        "question": "Does CSV → XML escape ampersands?",
        "answer": "Yes. Text is escaped for XML, and invalid XML characters are rejected."
      }
    ],
    "related": [
      "csv-html-table",
      "json-yaml"
    ]
  },
  "vcf-csv": {
    "description": "Convert basic vCard contacts to CSV or spreadsheet rows back to VCF. Understand supported fields and how multiple numbers or photos are handled.",
    "summary": "VCF is a contact-exchange format; CSV is useful for reviewing basic names and contact details in a spreadsheet. This simplified tool focuses on one display name, email, telephone and organization per contact.",
    "exampleFrom": "BEGIN:VCARD\nVERSION:3.0\nFN:Alice Example\nEMAIL:alice@example.com\nEND:VCARD",
    "exampleTo": "Name,Email,Phone,Organization\nAlice Example,alice@example.com,,",
    "sections": [
      {
        "heading": "Export a simple contact list",
        "paragraph": "VCF → CSV reads basic FN, EMAIL, TEL and ORG properties and writes a header row. Some real contact files contain multiple numbers, photos, addresses or vendor-specific attributes. Do not use this lightweight export as the only backup of a complete address book."
      },
      {
        "heading": "Build contacts from a spreadsheet",
        "paragraph": "CSV → VCF expects the exact Name, Email, Phone and Organization columns. A Name is required for each row. Check UTF-8 text and phone formatting before importing into your contacts application; that application may apply its own rules."
      },
      {
        "heading": "Review sensitive data",
        "paragraph": "Contacts contain personal information even when processed locally. Inspect a small sample in the destination address book, keep the original VCF file, and do not share exports unless the recipients are authorized."
      }
    ],
    "faq": [
      {
        "question": "Will every phone number and photo survive?",
        "answer": "No. Multiple values, images and extended vCard fields are not fully preserved."
      },
      {
        "question": "Do I need all four CSV columns?",
        "answer": "Yes. The reverse converter requires Name, Email, Phone and Organization headings."
      }
    ],
    "related": [
      "ics-csv",
      "csv-html-table"
    ]
  },
  "ics-csv": {
    "description": "Convert simple iCalendar events to CSV or spreadsheet rows into an ICS file. Check UTC timestamps, recurrence and timezone limitations.",
    "summary": "An ICS calendar file may hold event schedules, recurrence rules and attendee details. CSV is easier for reviewing a basic event list, but it cannot represent every calendar feature without losing information.",
    "exampleFrom": "BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:event-1\nDTSTART:20270101T090000Z\nSUMMARY:Review\nEND:VEVENT\nEND:VCALENDAR",
    "exampleTo": "UID,DTSTART,DTEND,SUMMARY,LOCATION,DESCRIPTION\nevent-1,20270101T090000Z,,Review,,",
    "sections": [
      {
        "heading": "Extract simple event fields",
        "paragraph": "ICS → CSV focuses on UID, DTSTART, DTEND, SUMMARY, LOCATION and DESCRIPTION. The basic parser is not a complete calendar migration tool. Recurrences, attendees and custom timezones require special handling, so keep the original ICS file."
      },
      {
        "heading": "Create UTC calendar events",
        "paragraph": "CSV → ICS requires those six column headings and valid UTC timestamps of the form YYYYMMDDTHHMMSSZ. A UID, start time and summary are mandatory for every event. Use UTC rather than writing an ambiguous local clock time without timezone context."
      },
      {
        "heading": "Import a test calendar first",
        "paragraph": "Before importing hundreds of events, open the result in a temporary calendar and verify dates, durations and special characters. A calendar application's interpretation of unsupported fields can differ, so do not rely on a CSV round trip to preserve the complete original event model."
      }
    ],
    "faq": [
      {
        "question": "Can I preserve weekly recurring meetings?",
        "answer": "Not in the simplified conversion. Keep the original ICS for recurrence definitions."
      },
      {
        "question": "Why must timestamps end in Z?",
        "answer": "The reverse converter requires explicit UTC times to avoid guessing the intended timezone."
      }
    ],
    "related": [
      "vcf-csv",
      "csv-html-table"
    ]
  }
};
