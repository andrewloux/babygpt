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
            Scattered in RAM. Chasing pointers is slow.
          </div>
          
          <div className={styles.nodeBox}>
            <div className={`${styles.memoryBlock} ${styles.overhead}`}>Object Header (16B)</div>
            <div className={`${styles.memoryBlock} ${styles.overhead}`}>Left Child Ptr (8B)</div>
            <div className={`${styles.memoryBlock} ${styles.overhead}`}>Right Child Ptr (8B)</div>
            <div className={`${styles.memoryBlock} ${styles.payload}`}>N-gram Data (4B)</div>
            <div className={styles.ptrArrow}></div>
          </div>
        </div>

        {/* Right: Flat Array */}
        <div className={styles.diagramCol}>
          <div className={styles.colTitle}>KenLM / Linear Probing</div>
          <div className={styles.colSubtitle}>
            "Packed Array"<br/>
            Contiguous in RAM. Cache friendly.
          </div>

          <div className={styles.arrayRow}>
            <div className={styles.arrayCell}>
              <span className={styles.cellLabel}>Hash (8B)</span>
              <span className={`${styles.cellValue} ${styles.cellHighlight}`}>0xA3...</span>
            </div>
            <div className={styles.arrayCell}>
              <span className={styles.cellLabel}>Prob (4B)</span>
              <span className={styles.cellValue}>-1.2</span>
            </div>
            <div className={styles.arrayCell}>
              <span className={styles.cellLabel}>Backoff (4B)</span>
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
          <span className={styles.mathLabel}>CPU Cache Misses:</span>
          <span className={`${styles.mathValue} ${styles.bad}`}>High (Random Access)</span>
          <span className={`${styles.mathValue} ${styles.good}`}>Low (Sequential)</span>
        </div>
      </div>
    </div>
  )
}
