function Reader(inputs, opts)
  local doc = pandoc.Pandoc{}  -- the resulting document

  -- parse input as Markdown
  local parse = function (input)
    return pandoc.read(tostring(input), 'markdown', opts)
  end
  
  -- Process each input file separately and merge it into the top-level
  -- document.
  for i, input in ipairs(inputs) do
    local part = parse(input, opts)
    -- add the title as a top-level heading
    if part.meta.title then
      doc.blocks:insert(pandoc.Header(1, part.meta.title))
      part.meta.title = nil  -- unset, so it won't conflict with main title
    end
    -- append the main contents to the result doc and merge all meta
    -- information. Shift headings in the part.
    doc = doc .. part:walk {
      Header = function (h)
        h.level = h.level + 1
        return h
      end
    }
  end
  return doc
end
