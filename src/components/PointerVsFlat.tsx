import styles from './PointerVsFlat.module.css'

export function PointerVsFlat() {
  return (
    <div className={styles.container}>
      <div className={styles.title}>Memory Layout: Objects vs. Flat Arrays</div>
      
      <div className={styles.diagramRow}>
        {/* Left: Graph Node */}
        <div className={styles.diagramCol}>
          <div className={styles.colTitle}>Typical C++/Python Object</div>
          <div className={styles.colSubtitle}>
            "Graph Node"<br/>
            Heap-allocated. Pointers store addresses to other heap allocations.<br/>
            100B items → log<sub>2</sub>(N) ≈ 37 hops
          </div>
          
          <div className={styles.nodeBox}>
            <div className={styles.memRow}>
              <div className={styles.addr}>0x7f21…1000</div>
              <div className={`${styles.memoryBlock} ${styles.overhead}`}>
                <div className={styles.fieldLabel}>Header (16B)</div>
                <div className={styles.fieldValue}>type + refcount + vtable</div>
              </div>
            </div>
            <div className={styles.memRow}>
              <div className={styles.addr}>0x7f21…1010</div>
              <div className={`${styles.memoryBlock} ${styles.overhead}`}>
                <div className={styles.fieldLabel}>Left ptr (8B)</div>
                <div className={styles.fieldValue}>→ 0x7fd1…a0c0</div>
              </div>
            </div>
            <div className={styles.memRow}>
              <div className={styles.addr}>0x7f21…1018</div>
              <div className={`${styles.memoryBlock} ${styles.overhead}`}>
                <div className={styles.fieldLabel}>Right ptr (8B)</div>
                <div className={styles.fieldValue}>→ 0x7f06…0090</div>
              </div>
            </div>
            <div className={styles.memRow}>
              <div className={styles.addr}>0x7f21…1020</div>
              <div className={`${styles.memoryBlock} ${styles.payload}`}>
                <div className={styles.fieldLabel}>Prob (4B)</div>
                <div className={styles.fieldValue}>-1.2</div>
              </div>
            </div>
            <div className={styles.memRow}>
              <div className={styles.addr}>0x7f21…1024</div>
              <div className={`${styles.memoryBlock} ${styles.payload}`}>
                <div className={styles.fieldLabel}>Backoff (4B)</div>
                <div className={styles.fieldValue}>-0.4</div>
              </div>
            </div>
            <div className={styles.ptrArrow}></div>
          </div>
        </div>

        {/* Right: Flat Array */}
        <div className={styles.diagramCol}>
          <div className={styles.colTitle}>KenLM / Linear Probing</div>
          <div className={styles.colSubtitle}>
            "Packed Array"<br/>
            Contiguous in RAM. Cache friendly.<br/>
            Often single-digit probes
          </div>

          <div className={styles.arrayRow}>
            <div className={styles.arrayCell}>
              <div className={styles.cellHeader}>
                <span className={styles.cellLabel}>Hash (8B)</span>
                <span className={styles.cellOffset}>@ +0x00</span>
              </div>
              <span className={`${styles.cellValue} ${styles.cellHighlight}`}>0xA3…</span>
            </div>
            <div className={styles.arrayCell}>
              <div className={styles.cellHeader}>
                <span className={styles.cellLabel}>Prob (4B)</span>
                <span className={styles.cellOffset}>@ +0x08</span>
              </div>
              <span className={styles.cellValue}>-1.2</span>
            </div>
            <div className={styles.arrayCell}>
              <div className={styles.cellHeader}>
                <span className={styles.cellLabel}>Backoff (4B)</span>
                <span className={styles.cellOffset}>@ +0x0C</span>
              </div>
              <span className={styles.cellValue}>-0.4</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.comparison}>
        <div className={styles.mathRow}>
          <span className={styles.mathLabel}>Overhead per item:</span>
          <span className={`${styles.mathValue} ${styles.bad}`}>~32 Bytes</span>
          <span className={`${styles.mathValue} ${styles.good}`}>0 Bytes</span>
        </div>
        <div className={styles.mathRow}>
          <span className={styles.mathLabel}>Lookup work (N=100B):</span>
          <span className={`${styles.mathValue} ${styles.bad}`}>~37 pointer hops</span>
          <span className={`${styles.mathValue} ${styles.good}`}>~1–10 probes</span>
        </div>
        <div className={styles.mathRow}>
          <span className={styles.mathLabel}>CPU Cache Misses:</span>
          <span className={`${styles.mathValue} ${styles.bad}`}>High (Random Access)</span>
          <span className={`${styles.mathValue} ${styles.good}`}>Low (Sequential)</span>
        </div>
      </div>
    </div>
  )
}
