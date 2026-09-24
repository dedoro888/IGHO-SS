with open('src/components/StaffPortal.tsx', 'r') as f:
    content = f.read()

# Normalize spacing to make replacements bulletproof
old_header = """              <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest px-4 font-mono h-6 flex items-center shrink-0">
                <AnimatePresence initial={false}>
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      Operations
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>"""

new_header = """              <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest px-4 font-mono h-6 flex items-center shrink-0">
                <span className={`transition-all duration-300 ${sidebarCollapsed ? 'opacity-0 scale-75' : 'opacity-100'}`}>
                  Operations
                </span>
              </div>"""

old_btn = """            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              className={`flex items-center justify-start h-10 rounded-full border relative cursor-pointer overflow-hidden transition-all duration-300 bg-black border-neutral-850 text-neutral-400 hover:text-white hover:border-neutral-700 ${
                sidebarCollapsed ? 'w-10' : 'w-full'
              }`}
            >
              <div className="w-10 h-10 flex items-center justify-center shrink-0">
                {sidebarCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-neutral-400 font-bold" />
                ) : (
                  <ChevronLeft className="w-4 h-4 text-white font-bold" />
                )}
              </div>
              {!sidebarCollapsed && (
                <span className="text-xs font-bold whitespace-nowrap ml-1">
                  Collapse
                </span>
              )}
            </button>"""

new_btn = """            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              className={`flex items-center justify-center h-10 rounded-full border relative cursor-pointer overflow-hidden transition-all duration-300 bg-black border-neutral-850 text-neutral-400 hover:text-white hover:border-neutral-700 ${
                sidebarCollapsed ? 'w-10' : 'w-full'
              }`}
            >
              <div className="w-10 h-10 flex items-center justify-center shrink-0">
                {sidebarCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-neutral-400 font-bold" />
                ) : (
                  <ChevronLeft className="w-4 h-4 text-white font-bold" />
                )}
              </div>
            </button>"""

header_found = old_header in content
btn_found = old_btn in content

print('Header found:', header_found)
print('Btn found:', btn_found)

if header_found:
    content = content.replace(old_header, new_header)
if btn_found:
    content = content.replace(old_btn, new_btn)

if header_found or btn_found:
    with open('src/components/StaffPortal.tsx', 'w') as f:
        f.write(content)
    print('Replacements applied successfully!')
else:
    print('No matches found. Applying line-by-line checks...')
    # Fallback to a lines-based replacement
    lines = content.split('\n')
    modified = False
    
    # Let's replace the header if found
    for i in range(len(lines) - 15):
        if 'Operations' in lines[i+9] and 'AnimatePresence' in lines[i+1] and 'sidebarCollapsed' in lines[i+2]:
            print('Found header at line:', i+1)
            lines[i+1:i+13] = [
                '                <span className={`transition-all duration-300 ${sidebarCollapsed ? \'opacity-0 scale-75\' : \'opacity-100\'}`}>',
                '                  Operations',
                '                </span>'
            ]
            modified = True
            break
            
    # Let's replace the collapse button
    for i in range(len(lines) - 20):
        if 'Collapse Sidebar' in lines[i+2] and 'className=' in lines[i+3] and 'setSidebarCollapsed' in lines[i+1]:
            print('Found button at line:', i+1)
            # Find the ending button tag
            for j in range(i+4, i+22):
                if '</button>' in lines[j]:
                    lines[i+3] = '              className={`flex items-center justify-center h-10 rounded-full border relative cursor-pointer overflow-hidden transition-all duration-300 bg-black border-neutral-850 text-neutral-400 hover:text-white hover:border-neutral-700 ${'
                    lines[i+14:j] = [] # Remove the text portion
                    modified = True
                    break
            if modified:
                break
                
    if modified:
        with open('src/components/StaffPortal.tsx', 'w') as f:
            f.write('\n'.join(lines))
        print('Line-by-line patch applied successfully!')
    else:
        print('Line-by-line patch failed.')
