INCLUDE Irvine32.inc

;  CONSTANTS
MIN_SIZE             EQU 20
MAX_SIZE             EQU 30
MIN_VAL              EQU 1
MAX_VAL              EQU 100
LINE_BUF_CAP         EQU 512


;  DATA SEGMENT

.data

; ── Array ─────────────────────────────────────────────────────────
theArray      DWORD MAX_SIZE DUP(?)   ; the working array
arraySize     DWORD 0                 ; number of elements in use
tempKey       DWORD 0                 ; scratch: key for Insertion Sort

; ── File handles & names ─────────────────────────────────────────
fileHandle    DWORD 0
fileName      BYTE "sort_data.txt", 0

; ── Line-build buffer (all file I/O is assembled here first) ──────
lineBuf       BYTE LINE_BUF_CAP DUP(0)
lineBufLen    DWORD 0

; ── Pass counter  (0 = initial snapshot, 1..N = pass N) ──────────
passNum       DWORD 0

;  CONSOLE STRINGS

str_b1    BYTE "  +=============================================+", 0
str_b2    BYTE "  |   HYBRID  SORTING  VISUALIZER   v1.0       |", 0
str_b3    BYTE "  |   x86 Assembly (Intel)  |  Irvine32 Lib    |", 0
str_b4    BYTE "  +=============================================+", 0
str_sep   BYTE "  -----------------------------------------------", 0

str_mi1   BYTE "  Input method:", 0
str_mi2   BYTE "    [1] Enter array manually   (1 – 100)", 0
str_mi3   BYTE "    [2] Generate random array  (1 – 100)", 0
str_pmi   BYTE "  --> ", 0

str_sz    BYTE "  Array size (20 – 30): ", 0
str_el    BYTE "  Element #", 0
str_rng   BYTE "  (1 – 100): ", 0

str_ei    BYTE "  [!] Invalid choice.  Please enter 1 or 2.", 0
str_es    BYTE "  [!] Size must be between 20 and 30.", 0
str_ev    BYTE "  [!] Value must be between 1 and 100.", 0
str_ea    BYTE "  [!] Please enter 1, 2, 3, 4, or 5.", 0
str_ef    BYTE "  [!] Cannot create sort_data.txt — aborting.", 0

str_ms1   BYTE "  Select sorting algorithm:", 0
str_ms2   BYTE "    [1] Bubble Sort", 0
str_ms3   BYTE "    [2] Selection Sort", 0
str_ms4   BYTE "    [3] Insertion Sort", 0
str_ms5   BYTE "    [4] Quick Sort", 0
str_ms6   BYTE "    [5] Merge Sort", 0
str_pms   BYTE "  --> ", 0

str_lo    BYTE "  Original Array  : ", 0
str_ls    BYTE "  Sorted  Array   : ", 0
str_lg    BYTE "  Sorting in progress …", 0
str_ld    BYTE "  Done!  Array fully sorted.", 0
str_lw    BYTE "  Every pass state written to: sort_data.txt", 0
str_lp    BYTE "  Press any key to exit …", 0

str_csv   BYTE ", ", 0

;  FILE STRINGS  (written into sort_data.txt)

fhBub   BYTE "=== BUBBLE SORT ===",              0Dh, 0Ah, 0
fhSel   BYTE "=== SELECTION SORT ===",           0Dh, 0Ah, 0
fhIns   BYTE "=== INSERTION SORT ===",           0Dh, 0Ah, 0
fhQck   BYTE "=== QUICK SORT ===",               0Dh, 0Ah, 0
fhMrg   BYTE "=== MERGE SORT ===",               0Dh, 0Ah, 0
fhSep   BYTE "---------------------------------------", 0Dh, 0Ah, 0

fpInit  BYTE "Initial : ", 0
fpPass  BYTE "Pass ", 0
fpCol   BYTE " : ", 0
fpCRLF  BYTE 0Dh, 0Ah, 0

;  CODE SEGMENT

.code

; ┌────────────────────────────────────────────────────────────────┐
; │  AppendByte                                                    │
; │  Appends AL to lineBuf[lineBufLen], increments lineBufLen.     │
; │  Preserves: all registers                                      │
; └────────────────────────────────────────────────────────────────┘
AppendByte PROC
    push edi
    push eax                    ; save AL we are about to store
    mov  edi, OFFSET lineBuf
    add  edi, lineBufLen
    mov  BYTE PTR [edi], al     ; store the byte
    inc  lineBufLen
    pop  eax
    pop  edi
    ret
AppendByte ENDP

; ┌────────────────────────────────────────────────────────────────┐
; │  AppendStr                                                     │
; │  Appends the null-terminated string at EDX to lineBuf.        │
; │  Preserves: all registers                                      │
; └────────────────────────────────────────────────────────────────┘
AppendStr PROC
    push esi
    push eax
    mov  esi, edx               ; ESI = string pointer

AppStr_loop:
    mov  al, BYTE PTR [esi]
    test al, al
    jz   AppStr_done
    call AppendByte             ; append AL
    inc  esi
    jmp  AppStr_loop

AppStr_done:
    pop  eax
    pop  esi
    ret
AppendStr ENDP

; ┌────────────────────────────────────────────────────────────────┐
; │  AppendUInt                                                    │
; │  Converts unsigned DWORD in EAX to decimal ASCII digits and   │
; │  appends them to lineBuf.                                      │
; │  Preserves: all registers                                      │
; └────────────────────────────────────────────────────────────────┘
AppendUInt PROC
    pushad

    test eax, eax               ; special-case zero
    jnz  AU_nonzero
    mov  al, '0'
    call AppendByte
    popad
    ret

AU_nonzero:
    xor  ecx, ecx               ; ECX = digit count pushed on stack
    mov  ebx, 10

AU_extract:                     ; reverse-extract digits
    test eax, eax
    jz   AU_emit
    xor  edx, edx
    div  ebx                    ; EAX = quotient, EDX = digit (0-9)
    push edx
    inc  ecx
    jmp  AU_extract

AU_emit:                        ; pop & emit in correct order
    test ecx, ecx
    jz   AU_done
    pop  edx
    add  dl, '0'
    mov  al, dl
    call AppendByte
    dec  ecx
    jmp  AU_emit

AU_done:
    popad
    ret
AppendUInt ENDP

; ┌────────────────────────────────────────────────────────────────┐
; │  FlushBuf                                                      │
; │  Writes lineBuf (lineBufLen bytes) to fileHandle via           │
; │  Irvine32 WriteToFile, then resets lineBufLen = 0.            │
; │  Preserves: all registers                                      │
; └────────────────────────────────────────────────────────────────┘
FlushBuf PROC
    pushad
    cmp  lineBufLen, 0
    je   FB_done

    mov  eax, fileHandle        ; EAX = file handle  (Irvine32 convention)
    mov  edx, OFFSET lineBuf    ; EDX = buffer address
    mov  ecx, lineBufLen        ; ECX = byte count
    call WriteToFile            ; Irvine32: writes ECX bytes from EDX

    mov  lineBufLen, 0          ; reset buffer position

FB_done:
    popad
    ret
FlushBuf ENDP

; ┌────────────────────────────────────────────────────────────────┐
; │  WriteAlgoHeader                                               │
; │  Writes: <algorithm name line>  +  <separator line> to file.  │
; │  EDX = pointer to algorithm header string                     │
; │  Preserves: all registers                                      │
; └────────────────────────────────────────────────────────────────┘
WriteAlgoHeader PROC
    pushad                      ; EDX still = caller's header pointer

    mov  lineBufLen, 0
    call AppendStr              ; append e.g. "=== BUBBLE SORT ===\r\n"
    call FlushBuf               ; write line 1

    mov  lineBufLen, 0
    mov  edx, OFFSET fhSep
    call AppendStr              ; append "---...\r\n"
    call FlushBuf               ; write line 2

    popad
    ret
WriteAlgoHeader ENDP

; ┌────────────────────────────────────────────────────────────────┐
; │  WritePassToFile                                               │
; │  Writes the current state of theArray[0..arraySize-1] to      │
; │  sort_data.txt as one line:                                    │
; │    passNum == 0 → "Initial : v0, v1, …, vn-1\r\n"             │
; │    passNum == N → "Pass N  : v0, v1, …, vn-1\r\n"             │
; │  Then increments passNum.                                      │
; │  Preserves: all registers                                      │
; └────────────────────────────────────────────────────────────────┘
WritePassToFile PROC
    pushad
    mov  lineBufLen, 0

    cmp  passNum, 0
    jne  WPF_pass_line

    ; ---- "Initial : " ----
    mov  edx, OFFSET fpInit
    call AppendStr
    jmp  WPF_array

    ; ---- "Pass N : " ----
WPF_pass_line:
    mov  edx, OFFSET fpPass
    call AppendStr              ; "Pass "
    mov  eax, passNum
    call AppendUInt             ; N
    mov  edx, OFFSET fpCol
    call AppendStr              ; " : "

WPF_array:
    ; ---- append each array element ----
    mov  esi, 0

WPF_loop:
    cmp  esi, arraySize
    jge  WPF_newline

    mov  eax, theArray[esi * 4]
    call AppendUInt

    ; append ", " only if not the last element
    mov  eax, esi
    inc  eax
    cmp  eax, arraySize
    jge  WPF_skip_comma
    mov  edx, OFFSET str_csv
    call AppendStr

WPF_skip_comma:
    inc  esi
    jmp  WPF_loop

WPF_newline:
    mov  edx, OFFSET fpCRLF
    call AppendStr
    call FlushBuf               ; ← Irvine32 WriteToFile fires here

    inc  passNum                ; advance counter for next call

    popad
    ret
WritePassToFile ENDP

; ┌────────────────────────────────────────────────────────────────┐
; │  DisplayArray                                                  │
; │  Prints theArray[0..arraySize-1] to the console.              │
; │  Preserves: all registers                                      │
; └────────────────────────────────────────────────────────────────┘
DisplayArray PROC
    pushad
    mov  esi, 0

DA_loop:
    cmp  esi, arraySize
    jge  DA_done

    mov  eax, theArray[esi * 4]
    call WriteDec               ; Irvine32: print EAX as unsigned decimal

    mov  eax, esi
    inc  eax
    cmp  eax, arraySize
    jge  DA_no_comma
    mov  edx, OFFSET str_csv
    call WriteString

DA_no_comma:
    inc  esi
    jmp  DA_loop

DA_done:
    call Crlf
    popad
    ret
DisplayArray ENDP

; ╔════════════════════════════════════════════════════════════════╗
; ║  GetArrayInput                                                 ║
; ║  Presents a menu: [1] manual entry, [2] random generation.    ║
; ║  Fills theArray[0..arraySize-1] with validated values 1-100.  ║
; ║  Preserves: all registers                                      ║
; ╚════════════════════════════════════════════════════════════════╝
GetArrayInput PROC
    pushad

; ── Main input-method menu ────────────────────────────────────────
GAI_menu:
    call Crlf
    mov  edx, OFFSET str_mi1
    call WriteString
    call Crlf
    mov  edx, OFFSET str_mi2
    call WriteString
    call Crlf
    mov  edx, OFFSET str_mi3
    call WriteString
    call Crlf
    mov  edx, OFFSET str_pmi
    call WriteString
    call ReadInt                ; returns choice in EAX

    cmp  eax, 1
    je   GAI_manual
    cmp  eax, 2
    je   GAI_random
    mov  edx, OFFSET str_ei
    call WriteString
    call Crlf
    jmp  GAI_menu

; ════════════════════════════════════════
;  BRANCH 1 – Manual entry
; ════════════════════════════════════════
GAI_manual:
GAI_M_size:
    call Crlf
    mov  edx, OFFSET str_sz
    call WriteString
    call ReadInt

    cmp  eax, MIN_SIZE
    jl   GAI_M_bad_size
    cmp  eax, MAX_SIZE
    jg   GAI_M_bad_size
    mov  arraySize, eax
    jmp  GAI_M_elements

GAI_M_bad_size:
    mov  edx, OFFSET str_es
    call WriteString
    call Crlf
    jmp  GAI_M_size

GAI_M_elements:
    mov  esi, 0                 ; ESI = element index

GAI_M_elem_loop:
    cmp  esi, arraySize
    jge  GAI_done               ; all elements entered

    ; "  Element #N (1-100): "
    mov  edx, OFFSET str_el
    call WriteString
    mov  eax, esi
    inc  eax
    call WriteDec
    mov  edx, OFFSET str_rng
    call WriteString
    call ReadInt

    cmp  eax, MIN_VAL
    jl   GAI_M_bad_val
    cmp  eax, MAX_VAL
    jg   GAI_M_bad_val

    mov  theArray[esi * 4], eax ; store valid value
    inc  esi
    jmp  GAI_M_elem_loop

GAI_M_bad_val:
    mov  edx, OFFSET str_ev
    call WriteString
    call Crlf
    jmp  GAI_M_elem_loop        ; re-prompt same index (esi not incremented)

; ════════════════════════════════════════
;  BRANCH 2 – Random generation
; ════════════════════════════════════════
GAI_random:
GAI_R_size:
    call Crlf
    mov  edx, OFFSET str_sz
    call WriteString
    call ReadInt

    cmp  eax, MIN_SIZE
    jl   GAI_R_bad_size
    cmp  eax, MAX_SIZE
    jg   GAI_R_bad_size
    mov  arraySize, eax
    jmp  GAI_R_generate

GAI_R_bad_size:
    mov  edx, OFFSET str_es
    call WriteString
    call Crlf
    jmp  GAI_R_size

GAI_R_generate:
    call Randomize              ; Irvine32: seed RNG from system clock
    mov  esi, 0

GAI_R_loop:
    cmp  esi, arraySize
    jge  GAI_done

    mov  eax, MAX_VAL           ; Irvine32 RandomRange(EAX) → [0, EAX-1]
    call RandomRange            ; EAX ← random in [0, 99]
    inc  eax                    ; shift to [1, 100]
    mov  theArray[esi * 4], eax
    inc  esi
    jmp  GAI_R_loop

; ════════════════════════════════════════
GAI_done:
    popad
    ret
GetArrayInput ENDP

; ╔════════════════════════════════════════════════════════════════╗
; ║  SORTING  ALGORITHM  1 — BUBBLE SORT                          ║
; ║                                                               ║
; ║  Strategy  : Repeatedly compare and swap adjacent pairs.      ║
; ║              After each outer pass the largest unsorted       ║
; ║              element has "bubbled" to its final position.     ║
; ║  Complexity: O(n²) comparisons, O(n²) swaps worst case       ║
; ║  File I/O  : WritePassToFile after every outer-loop pass      ║
; ║              (n-1 passes) + 1 initial snapshot                ║
; ╚════════════════════════════════════════════════════════════════╝
BubbleSort PROC
    pushad

    mov  edx, OFFSET fhBub
    call WriteAlgoHeader

    mov  passNum, 0
    call WritePassToFile        ; initial snapshot

    mov  ebx, arraySize
    dec  ebx                    ; EBX = n-1  (total outer passes needed)
    mov  ecx, 0                 ; ECX = i  (outer pass index, 0-based)

BS_outer:
    cmp  ecx, ebx               ; i < n-1 ?
    jge  BS_done

    ; Inner loop: j = 0 … (n-2-i)
    mov  esi, 0                 ; ESI = j
    mov  edi, arraySize
    dec  edi                    ; EDI = n-1
    sub  edi, ecx               ; EDI = (n-1) - i  (last compare position)

BS_inner:
    cmp  esi, edi               ; j < (n-1-i) ?
    jge  BS_end_inner

    mov  eax, theArray[esi * 4]         ; array[j]
    mov  edx, theArray[esi * 4 + 4]    ; array[j+1]
    cmp  eax, edx
    jle  BS_no_swap

    ; swap array[j]  ↔  array[j+1]
    mov  theArray[esi * 4],     edx
    mov  theArray[esi * 4 + 4], eax

BS_no_swap:
    inc  esi
    jmp  BS_inner

BS_end_inner:
    call WritePassToFile        ; ← snapshot after pass i
    inc  ecx
    jmp  BS_outer

BS_done:
    popad
    ret
BubbleSort ENDP

; ╔════════════════════════════════════════════════════════════════╗
; ║  SORTING  ALGORITHM  2 — SELECTION SORT                       ║
; ║                                                               ║
; ║  Strategy  : For each position i, find the minimum element    ║
; ║              in theArray[i..n-1] and swap it into position i. ║
; ║  Complexity: O(n²) comparisons, O(n) swaps                   ║
; ║  File I/O  : WritePassToFile after each minimum-placement     ║
; ╚════════════════════════════════════════════════════════════════╝
SelectionSort PROC
    pushad

    mov  edx, OFFSET fhSel
    call WriteAlgoHeader

    mov  passNum, 0
    call WritePassToFile

    mov  ecx, 0                 ; ECX = i

SS_outer:
    mov  eax, arraySize
    dec  eax
    cmp  ecx, eax               ; i < n-1 ?
    jge  SS_done

    mov  esi, ecx               ; ESI = minIdx  (starts at i)
    mov  edi, ecx
    inc  edi                    ; EDI = j  (search starts at i+1)

SS_find_min:
    cmp  edi, arraySize
    jge  SS_do_swap

    mov  eax, theArray[edi * 4]         ; array[j]
    cmp  eax, theArray[esi * 4]         ; vs array[minIdx]
    jge  SS_no_update
    mov  esi, edi               ; new minimum found at j

SS_no_update:
    inc  edi
    jmp  SS_find_min

SS_do_swap:
    cmp  esi, ecx               ; skip if minIdx already equals i
    je   SS_no_swap

    ; swap array[i]  ↔  array[minIdx]
    mov  eax, theArray[ecx * 4]
    mov  edx, theArray[esi * 4]
    mov  theArray[ecx * 4], edx
    mov  theArray[esi * 4], eax

SS_no_swap:
    call WritePassToFile        ; ← snapshot after placing element i
    inc  ecx
    jmp  SS_outer

SS_done:
    popad
    ret
SelectionSort ENDP

; ╔════════════════════════════════════════════════════════════════╗
; ║  SORTING  ALGORITHM  3 — INSERTION SORT                       ║
; ║                                                               ║
; ║  Strategy  : Maintain a growing sorted prefix. For each new   ║
; ║              element, shift larger sorted elements right       ║
; ║              until the correct gap is found, then insert.     ║
; ║  Complexity: O(n²) worst, O(n) best (nearly-sorted input)    ║
; ║  File I/O  : WritePassToFile after each element is inserted   ║
; ╚════════════════════════════════════════════════════════════════╝
InsertionSort PROC
    pushad

    mov  edx, OFFSET fhIns
    call WriteAlgoHeader

    mov  passNum, 0
    call WritePassToFile

    mov  ecx, 1                 ; ECX = i  (first unsorted element)

IS_outer:
    cmp  ecx, arraySize
    jge  IS_done

    mov  eax, theArray[ecx * 4]
    mov  tempKey, eax           ; key = array[i]  (value to insert)

    mov  esi, ecx
    dec  esi                    ; ESI = j = i-1  (scan left through sorted region)

IS_inner:
    cmp  esi, 0
    jl   IS_place               ; j < 0 → insert at position 0

    mov  eax, theArray[esi * 4] ; array[j]
    cmp  eax, tempKey
    jle  IS_place               ; array[j] ≤ key → correct gap found

    ; shift: array[j+1] = array[j]
    mov  theArray[esi * 4 + 4], eax
    dec  esi                    ; j--  (ESI may become 0xFFFFFFFF = -1 signed)
    jmp  IS_inner

IS_place:
    ; j+1 is the insertion position
    inc  esi                    ; if esi was -1 (0xFFFFFFFF), inc → 0
    mov  eax, tempKey
    mov  theArray[esi * 4], eax ; array[j+1] = key

    call WritePassToFile        ; ← snapshot after inserting element i
    inc  ecx
    jmp  IS_outer

IS_done:
    popad
    ret
InsertionSort ENDP

; ╔════════════════════════════════════════════════════════════════╗
; ║  SORTING  ALGORITHM  4 — QUICK SORT                          ║
; ║                                                               ║
; ║  Strategy  : Partition around a middle pivot, then recursively║
; ║              sort the left and right partitions.              ║
; ║  Complexity: O(n log n) average, O(n²) worst                  ║
; ║  File I/O  : WritePassToFile after each partition             ║
; ╚════════════════════════════════════════════════════════════════╝
QuickSort PROC
    pushad

    mov  edx, OFFSET fhQck
    call WriteAlgoHeader

    mov  passNum, 0
    call WritePassToFile

    cmp  arraySize, 1
    jle  QS_done

    mov  eax, 0                 ; low index
    mov  ebx, arraySize
    dec  ebx                    ; high index = n-1
    call QuickSortRange

QS_done:
    popad
    ret
QuickSort ENDP

QuickSortRange PROC
    pushad

    cmp  eax, ebx               ; low >= high ?
    jge  QSR_done

    mov  esi, eax               ; ESI = i
    mov  edi, ebx               ; EDI = j

    mov  ecx, eax
    add  ecx, ebx
    shr  ecx, 1                 ; middle index
    mov  edx, theArray[ecx * 4] ; EDX = pivot value

QSR_partition:
    cmp  esi, edi
    jg   QSR_partition_done

QSR_scan_left:
    cmp  esi, edi
    jg   QSR_partition_done
    mov  ecx, theArray[esi * 4]
    cmp  ecx, edx
    jge  QSR_scan_right
    inc  esi
    jmp  QSR_scan_left

QSR_scan_right:
    cmp  esi, edi
    jg   QSR_partition_done
    mov  ecx, theArray[edi * 4]
    cmp  ecx, edx
    jle  QSR_swap
    dec  edi
    jmp  QSR_scan_right

QSR_swap:
    cmp  esi, edi
    jg   QSR_partition_done

    mov  ecx, theArray[esi * 4]
    mov  ebp, theArray[edi * 4]
    mov  theArray[esi * 4], ebp
    mov  theArray[edi * 4], ecx

    inc  esi
    dec  edi
    jmp  QSR_partition

QSR_partition_done:
    call WritePassToFile

    cmp  eax, edi               ; sort low..j
    jge  QSR_skip_left
    push eax
    push ebx
    mov  ebx, edi
    call QuickSortRange
    pop  ebx
    pop  eax

QSR_skip_left:
    cmp  esi, ebx               ; sort i..high
    jge  QSR_done
    push eax
    push ebx
    mov  eax, esi
    call QuickSortRange
    pop  ebx
    pop  eax

QSR_done:
    popad
    ret
QuickSortRange ENDP

; ╔════════════════════════════════════════════════════════════════╗
; ║  SORTING  ALGORITHM  5 — MERGE SORT                          ║
; ║                                                               ║
; ║  Strategy  : Repeatedly merge sorted runs of size 1, 2, 4,    ║
; ║              and so on until the whole array is sorted.       ║
; ║  Complexity: O(n log n)                                       ║
; ║  File I/O  : WritePassToFile after each full merge width      ║
; ╚════════════════════════════════════════════════════════════════╝
MergeSort PROC
    pushad

    mov  edx, OFFSET fhMrg
    call WriteAlgoHeader

    mov  passNum, 0
    call WritePassToFile

    cmp  arraySize, 1
    jle  MS_done

    mov  esi, 1                 ; ESI = current run width

MS_width_loop:
    cmp  esi, arraySize
    jge  MS_done

    mov  edi, 0                 ; EDI = left edge of pair

MS_left_loop:
    cmp  edi, arraySize
    jge  MS_end_width

    mov  eax, edi               ; EAX = left
    mov  ebx, edi
    add  ebx, esi               ; EBX = mid
    cmp  ebx, arraySize
    jle  MS_mid_ok
    mov  ebx, arraySize

MS_mid_ok:
    mov  ecx, edi
    mov  edx, esi
    shl  edx, 1
    add  ecx, edx               ; ECX = right
    cmp  ecx, arraySize
    jle  MS_right_ok
    mov  ecx, arraySize

MS_right_ok:
    cmp  ebx, ecx               ; skip if there is no right run
    jge  MS_next_pair
    call MergeRange

MS_next_pair:
    mov  edx, esi
    shl  edx, 1
    add  edi, edx
    jmp  MS_left_loop

MS_end_width:
    call WritePassToFile
    shl  esi, 1
    jmp  MS_width_loop

MS_done:
    popad
    ret
MergeSort ENDP

MergeRange PROC
    pushad
    push eax                    ; save left index for copy-back

    mov  esi, eax               ; ESI = i
    mov  edi, ebx               ; EDI = j
    mov  lineBufLen, 0          ; reused here as temp-buffer element count

MR_merge_loop:
    cmp  esi, ebx
    jge  MR_copy_right
    cmp  edi, ecx
    jge  MR_copy_left

    mov  eax, theArray[esi * 4]
    mov  edx, theArray[edi * 4]
    cmp  eax, edx
    jle  MR_take_left

MR_take_right:
    mov  ebp, lineBufLen
    mov  DWORD PTR lineBuf[ebp * 4], edx
    inc  lineBufLen
    inc  edi
    jmp  MR_merge_loop

MR_take_left:
    mov  ebp, lineBufLen
    mov  DWORD PTR lineBuf[ebp * 4], eax
    inc  lineBufLen
    inc  esi
    jmp  MR_merge_loop

MR_copy_left:
    cmp  esi, ebx
    jge  MR_copy_back
    mov  eax, theArray[esi * 4]
    mov  ebp, lineBufLen
    mov  DWORD PTR lineBuf[ebp * 4], eax
    inc  lineBufLen
    inc  esi
    jmp  MR_copy_left

MR_copy_right:
    cmp  edi, ecx
    jge  MR_copy_back
    mov  edx, theArray[edi * 4]
    mov  ebp, lineBufLen
    mov  DWORD PTR lineBuf[ebp * 4], edx
    inc  lineBufLen
    inc  edi
    jmp  MR_copy_right

MR_copy_back:
    mov  esi, 0
    mov  edi, DWORD PTR [esp]   ; original left index

MR_back_loop:
    cmp  esi, lineBufLen
    jge  MR_done
    mov  eax, DWORD PTR lineBuf[esi * 4]
    mov  theArray[edi * 4], eax
    inc  esi
    inc  edi
    jmp  MR_back_loop

MR_done:
    mov  lineBufLen, 0
    add  esp, 4
    popad
    ret
MergeRange ENDP

; ╔════════════════════════════════════════════════════════════════╗
; ║  MAIN                                                          ║
; ╚════════════════════════════════════════════════════════════════╝
main PROC

    ; ── Banner ────────────────────────────────────────────────────
    call Crlf
    mov  edx, OFFSET str_b1
    call WriteString
    call Crlf
    mov  edx, OFFSET str_b2
    call WriteString
    call Crlf
    mov  edx, OFFSET str_b3
    call WriteString
    call Crlf
    mov  edx, OFFSET str_b4
    call WriteString
    call Crlf

    ; ── Collect array input ───────────────────────────────────────
    call GetArrayInput

    ; ── Display original array ────────────────────────────────────
    call Crlf
    mov  edx, OFFSET str_lo
    call WriteString
    call DisplayArray

    ; ── Create output file (Irvine32: CreateOutputFile) ──────────
    ;    EDX = null-terminated filename
    ;    Returns EAX = file handle  (INVALID_HANDLE_VALUE on fail)
    mov  edx, OFFSET fileName
    call CreateOutputFile
    mov  fileHandle, eax

    cmp  eax, INVALID_HANDLE_VALUE
    jne  MAIN_sort_menu

    mov  edx, OFFSET str_ef
    call WriteString
    call Crlf
    jmp  MAIN_exit

    ; ── Sorting-algorithm selection menu ─────────────────────────
MAIN_sort_menu:
    call Crlf
    mov  edx, OFFSET str_sep
    call WriteString
    call Crlf
    mov  edx, OFFSET str_ms1
    call WriteString
    call Crlf
    mov  edx, OFFSET str_ms2
    call WriteString
    call Crlf
    mov  edx, OFFSET str_ms3
    call WriteString
    call Crlf
    mov  edx, OFFSET str_ms4
    call WriteString
    call Crlf
    mov  edx, OFFSET str_ms5
    call WriteString
    call Crlf
    mov  edx, OFFSET str_ms6
    call WriteString
    call Crlf
    mov  edx, OFFSET str_pms
    call WriteString
    call ReadInt

    cmp  eax, 1
    je MAIN_bubble
    cmp  eax, 2
    je MAIN_select
    cmp  eax, 3
    je MAIN_insert
    cmp  eax, 4
    je MAIN_quick
    cmp  eax, 5
    je MAIN_merge

    mov  edx, OFFSET str_ea
    call WriteString
    call Crlf
    jmp  MAIN_sort_menu

MAIN_bubble:
    mov  edx, OFFSET str_lg
    call WriteString
    call Crlf
    call BubbleSort
    jmp  MAIN_finish

MAIN_select:
    mov  edx, OFFSET str_lg
    call WriteString
    call Crlf
    call SelectionSort
    jmp  MAIN_finish

MAIN_insert:
    mov  edx, OFFSET str_lg
    call WriteString
    call Crlf
    call InsertionSort
    jmp  MAIN_finish

MAIN_quick:
    mov  edx, OFFSET str_lg
    call WriteString
    call Crlf
    call QuickSort
    jmp  MAIN_finish

MAIN_merge:
    mov  edx, OFFSET str_lg
    call WriteString
    call Crlf
    call MergeSort

MAIN_finish:
    ; ── Close file (Irvine32: CloseFile) ─────────────────────────
    ;    EAX = file handle
    mov  eax, fileHandle
    call CloseFile

    ; ── Display sorted array ──────────────────────────────────────
    call Crlf
    mov  edx, OFFSET str_ls
    call WriteString
    call DisplayArray

    ; ── Summary ───────────────────────────────────────────────────
    call Crlf
    mov  edx, OFFSET str_ld
    call WriteString
    call Crlf
    mov  edx, OFFSET str_lw
    call WriteString
    call Crlf

MAIN_exit:
    call Crlf
    mov  edx, OFFSET str_lp
    call WriteString
    call ReadChar               ; pause before window closes
    call Crlf
    exit                        ; Irvine32 macro → ExitProcess 0

main ENDP
    
END main
