import {
  CPU_ARCHITECTURE_LINEAGE_PART_ONE as article,
} from "@lkmlens/shared";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { SectionMarker } from "../components/SectionMarker.tsx";
import { SourceLink } from "../components/SourceLink.tsx";
import { formatDate } from "../lib/format.ts";
import { frameRead } from "../lib/frame.ts";

interface EditorialSource {
  id: string;
  title: string;
  publisher: string;
  year: string;
  url: string;
  note: string;
}

const SOURCES: EditorialSource[] = [
  {
    id: "s1",
    title: "Reduced instruction set computer (RISC) architecture",
    publisher: "IBM",
    year: "2025",
    url: "https://www.ibm.com/history/risc",
    note: "IBM 801, the parallel Berkeley and Stanford projects, RS/6000, POWER, and PowerPC.",
  },
  {
    id: "s2",
    title: "Design and Implementation of RISC I",
    publisher: "UC Berkeley EECS",
    year: "1982",
    url: "https://www2.eecs.berkeley.edu/Pubs/TechRpts/1982/5449.html",
    note: "Patterson and Séquin's technical report on the RISC I architecture and implementation.",
  },
  {
    id: "s3",
    title: "John Hennessy",
    publisher: "Stanford Computer Science",
    year: "2026",
    url: "https://www.cs.stanford.edu/people/john-hennessy",
    note: "Stanford's account of the 1981 RISC research effort and the 1984 founding of MIPS Computer Systems.",
  },
  {
    id: "s4",
    title: "Interview with John Hennessy",
    publisher: "Stanford Computer Science",
    year: "2000",
    url: "https://cs.stanford.edu/people/eroberts/courses/soco/projects/risc/about/interview.html",
    note: "A first-person account of the compiler-driven ideas behind the Stanford MIPS project.",
  },
  {
    id: "s5",
    title: "SPARC Timeline",
    publisher: "SPARC International",
    year: "n.d.",
    url: "https://sparc.org/timeline/",
    note: "SPARC's 1984 definition at Sun and its relationship to Berkeley RISC.",
  },
  {
    id: "s6",
    title: "The official history of Arm",
    publisher: "Arm Newsroom",
    year: "2026",
    url: "https://newsroom.arm.com/blog/arm-official-history",
    note: "ARM1, Acorn's processor work, Arm's 1990 founding, and the licensing model.",
  },
  {
    id: "s7",
    title: "The Beginning of a Legend: The 8086",
    publisher: "Intel",
    year: "1978",
    url: "https://timeline.intel.com/1978/the-beginning-of-a-legend%3A-the-8086",
    note: "Intel's history of the 8086 and the compatibility lineage that followed.",
  },
  {
    id: "s8",
    title: "2003 Annual Report",
    publisher: "Advanced Micro Devices",
    year: "2004",
    url: "https://ir.amd.com/financial-information/sec-filings/content/0001193125-04-037179/d10k.htm",
    note: "AMD's contemporary account of Opteron, Athlon 64, and the x86 extension to 64-bit computing.",
  },
  {
    id: "s9",
    title: "About RISC-V",
    publisher: "RISC-V International",
    year: "2026",
    url: "https://riscv.org/about/",
    note: "The project's May 2010 start at UC Berkeley and the open-standard governance model.",
  },
  {
    id: "s10",
    title: "RISC-V FAQ",
    publisher: "RISC-V International",
    year: "2026",
    url: "https://riscv.org/about/faq/",
    note: "The origin of the RISC-V name and its relationship to earlier Berkeley RISC projects.",
  },
  {
    id: "s11",
    title: "RISC-V Unprivileged ISA: Introduction",
    publisher: "RISC-V International",
    year: "2026",
    url: "https://docs.riscv.org/reference/isa/unpriv/unpriv-index.html",
    note: "The ratified ISA's base-plus-extensions structure and implementation-neutral design.",
  },
  {
    id: "s12",
    title: "Intel 64 and IA-32 Architectures Software Developer Manuals",
    publisher: "Intel",
    year: "2026",
    url: "https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html",
    note: "The architecture, system programming, and optimization manuals for contemporary x86 processors.",
  },
  {
    id: "s13",
    title: "CPU Architectures",
    publisher: "Linux Kernel Documentation",
    year: "2026",
    url: "https://docs.kernel.org/arch/index.html",
    note: "The kernel's architecture-specific documentation for x86, Arm, RISC-V, PowerPC, MIPS, SPARC, and others.",
  },
  {
    id: "s14",
    title: "arch/Kconfig",
    publisher: "Linux kernel source",
    year: "2026",
    url: "https://github.com/torvalds/linux/blob/master/arch/Kconfig",
    note: "The common architecture configuration layer and its handoff to arch/$(SRCARCH)/Kconfig.",
  },
];

const sourceMap = new Map(SOURCES.map((source) => [source.id, source]));

function Citations({ ids }: { ids: string[] }) {
  return (
    <>
      {ids.map((id) => {
        const source = sourceMap.get(id);
        return source ? (
          <SourceLink
            key={id}
            href={source.url}
            className="ml-1 align-super font-mono text-meta no-underline"
            title={`${source.publisher}: ${source.title}`}
          >
            [{id.slice(1)}]
          </SourceLink>
        ) : null;
      })}
    </>
  );
}

function Prose({
  children,
  sources,
  className = "",
}: {
  children: ReactNode;
  sources: string[];
  className?: string;
}) {
  return (
    <p className={`text-body-lg leading-8 text-ink-secondary ${className}`}>
      {children}
      <Citations ids={sources} />
    </p>
  );
}

function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-sm border border-border bg-surface-subtle px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
      {children}
    </code>
  );
}

function TextDiagram({ caption, children }: { caption: string; children: string }) {
  return (
    <figure className="overflow-hidden rounded-lg border border-border-strong bg-surface">
      <figcaption className="border-b border-border px-4 py-3 text-small font-medium text-ink">
        {caption}
      </figcaption>
      <pre
        tabIndex={0}
        className="focus-ring overflow-x-auto bg-surface-subtle px-4 py-5 font-mono text-[0.8rem] leading-6 text-ink-secondary sm:text-[0.86rem]"
      >
        <code>{children}</code>
      </pre>
    </figure>
  );
}

export default function CpuArchitectureLineage() {
  return (
    <article className={`${frameRead} py-12 sm:py-16`}>
      <Link to="/blog" className="focus-ring text-small text-ink-muted hover:text-accent">
        ← All analysis
      </Link>

      <header className="mt-6 border-b border-border-strong pb-8">
        <SectionMarker label={`${article.series} · Part ${article.part}`} />
        <h1 className="mt-3 text-h1 text-ink">{article.title}</h1>
        <p className="mt-4 text-body-lg text-ink-secondary">{article.dek}</p>
        <p className="tabular mt-5 font-mono text-meta tracking-[0.04em] text-ink-muted uppercase">
          Published {formatDate(article.publishedAt)} · {article.readingMinutes} min read
        </p>
      </header>

      <aside className="my-8 border-l-2 border-accent bg-surface-subtle px-5 py-4">
        <p className="font-mono text-meta tracking-[0.08em] text-accent uppercase">
          Editorial feature · primary-source reviewed
        </p>
        <p className="mt-1.5 text-small text-ink-secondary">
          This is an evergreen architecture primer, not a claim that one ISA is universally faster than another.
          The historical map distinguishes direct product lineage from broader design influence.
        </p>
      </aside>

      <figure className="my-9 overflow-hidden rounded-lg border border-border-strong bg-surface">
        <img
          src="/images/cpu-architecture-lineage.svg"
          alt="Timeline and influence map showing the x86 compatibility line, the IBM 801 to POWER and PowerPC line, Berkeley RISC to SPARC, Stanford MIPS, Acorn Arm, and the later RISC-V project."
          className="block h-auto w-full"
        />
        <figcaption className="border-t border-border px-4 py-3 text-small leading-6 text-ink-muted">
          A map of architectural lineages and influences—not a binary-compatibility family tree.
          Solid arrows indicate a relatively direct product or architecture line; dashed arrows indicate intellectual influence.
          <Citations ids={["s1", "s2", "s3", "s5", "s6", "s7", "s9"]} />
        </figcaption>
      </figure>

      <div className="space-y-6">
        <Prose sources={["s7", "s8", "s13"]}>
          Linux can boot on an Intel Xeon, an AMD EPYC, an Arm server, or a RISC-V development board.
          The kernel may expose nearly the same system-call interface to user space, but those processors do not speak
          the same machine language. Their boot protocols, privilege levels, page-table formats, interrupt controllers,
          atomic instructions, and memory-ordering rules also differ. The shared kernel is therefore built on top of
          several distinct architectural contracts.
        </Prose>
        <Prose sources={["s1", "s2", "s3"]}>
          The usual story compresses this history into a contest between CISC and RISC. That is useful as a first
          approximation, but misleading as a family tree. RISC was not one processor from which every later RISC ISA
          descended. IBM, Berkeley, Stanford, and Acorn developed related ideas in overlapping periods, sometimes
          influencing one another and sometimes arriving at similar answers independently.
        </Prose>
      </div>

      <section className="mt-12">
        <h2 className="border-t border-border-strong pt-5 text-h2 text-ink">
          1. Start with the contract: an ISA is not a CPU
        </h2>
        <div className="mt-5 space-y-6">
          <Prose sources={["s11", "s12"]}>
            An instruction set architecture, or ISA, is the software-visible contract between machine code and a
            processor. It defines instructions, registers, data types, addressing rules, privilege behavior, exceptions,
            and enough of the memory model for compilers, operating systems, and binaries to agree on what execution means.
            x86-64, AArch64, and RV64 are ISAs. “Intel Core,” “Apple M-series,” and a particular RISC-V core are
            implementations.
          </Prose>
          <Prose sources={["s11", "s12"]}>
            Microarchitecture is how a processor implements that contract: pipeline depth, instruction decoding,
            branch prediction, register renaming, out-of-order scheduling, cache hierarchy, execution ports, and many
            other choices. Two chips can run the same ISA while having radically different microarchitectures and
            performance characteristics. Conversely, processors implementing different ISAs can use strikingly similar
            internal techniques.
          </Prose>
          <TextDiagram caption="One source program, several machine-code contracts">
{`C / C++ / Rust
       │
       ▼
    compiler
       │
       ├──► x86-64 binary  ──► Intel / AMD implementation
       ├──► AArch64 binary ──► Arm-compatible implementation
       └──► RV64 binary    ──► RISC-V implementation

ISA: what software may assume
Microarchitecture: how a chip makes it happen`}
          </TextDiagram>
          <Prose sources={["s11"]}>
            This distinction prevents several common mistakes. RISC does not mean “a physically small processor.”
            CISC does not mean “one instruction always does an entire application-level job.” Fixed-width encoding is
            common in classic RISC designs, but it is not a universal law: Arm has Thumb encodings and RISC-V has an
            optional compressed-instruction extension. The ISA sets semantics; it does not dictate one pipeline.
          </Prose>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="border-t border-border-strong pt-5 text-h2 text-ink">
          2. The x86 line: compatibility becomes architecture
        </h2>
        <div className="mt-5 space-y-6">
          <Prose sources={["s1", "s7"]}>
            By the 1970s, complex instruction sets were the conventional approach. Memory was expensive, compact machine
            code mattered, and microcode made it practical to implement rich operations behind a programmable-looking
            interface. Intel introduced the 16-bit 8086 on June 8, 1978. Later processors extended its programming model
            rather than starting over, creating the compatibility lineage eventually called x86.
          </Prose>
          <Prose sources={["s7"]}>
            That continuity became more than a technical detail. Software, operating systems, compilers, firmware,
            peripherals, and developer knowledge accumulated around the architecture. Each generation could add
            protected execution, wider registers, virtual memory, SIMD, virtualization, and security features while
            retaining a path for older software. Backward compatibility became x86’s strongest product feature—and one
            of its largest design constraints.
          </Prose>
          <Prose sources={["s8"]}>
            The decisive 64-bit transition came from AMD. The AMD Opteron launched in April 2003 and Athlon 64 followed
            in September. AMD described Opteron as the first processor to extend the industry-standard x86 ISA to 64-bit
            computing while running both 32-bit and 64-bit applications. What Linux commonly calls
            <InlineCode>x86_64</InlineCode> therefore follows the AMD64 extension, later implemented across the broader
            x86 ecosystem.
          </Prose>
          <div className="overflow-x-auto rounded-lg border border-border-strong">
            <table className="min-w-full border-collapse text-left text-small">
              <caption className="border-b border-border bg-surface-subtle px-4 py-3 text-left font-medium text-ink">
                The x86 strategy in one view
              </caption>
              <thead className="bg-surface-subtle font-mono text-meta tracking-[0.05em] text-ink-muted uppercase">
                <tr>
                  <th className="border-b border-border px-4 py-3">Stage</th>
                  <th className="border-b border-border px-4 py-3">What changed</th>
                  <th className="border-b border-border px-4 py-3">What stayed valuable</th>
                </tr>
              </thead>
              <tbody className="text-ink-secondary">
                <tr>
                  <td className="border-b border-border px-4 py-3 font-mono text-ink">8086</td>
                  <td className="border-b border-border px-4 py-3">A 16-bit starting point</td>
                  <td className="border-b border-border px-4 py-3">Tools and software compatibility</td>
                </tr>
                <tr>
                  <td className="border-b border-border px-4 py-3 font-mono text-ink">IA-32</td>
                  <td className="border-b border-border px-4 py-3">32-bit registers, addressing, and protection evolved</td>
                  <td className="border-b border-border px-4 py-3">The installed x86 software base</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-mono text-ink">x86-64</td>
                  <td className="px-4 py-3">64-bit addressing and additional registers</td>
                  <td className="px-4 py-3">A migration path for existing 32-bit workloads</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="border-t border-border-strong pt-5 text-h2 text-ink">
          3. RISC was a movement, not a single bloodline
        </h2>
        <div className="mt-5 space-y-6">
          <Prose sources={["s1"]}>
            IBM’s work began in 1974 under John Cocke while exploring a high-performance telephone switching controller.
            The controller project ended, but the compiler and architecture work continued. In 1980, IBM produced the
            801 prototype: a register-oriented machine built around a smaller set of frequently useful operations and a
            pipeline-friendly implementation.
          </Prose>
          <Prose sources={["s1", "s2"]}>
            At UC Berkeley, David Patterson and Carlo Séquin led the project that popularized the name “Reduced
            Instruction Set Computer.” RISC I was designed and built in the early 1980s as a single-chip VLSI processor.
            Its report argued that fewer instructions and addressing modes could shrink the control section, shorten the
            machine cycle, and make a high-throughput implementation practical.
          </Prose>
          <Prose sources={["s1", "s3", "s4"]}>
            At Stanford, John Hennessy initiated the MIPS project in 1981. The Stanford group approached the hardware-
            software boundary from a compiler background: instead of making hardware imitate high-level language
            constructs, they wanted optimizing compilers to schedule simple operations close to the pipeline. Hennessy
            then co-founded MIPS Computer Systems in 1984 to commercialize the work.
          </Prose>
          <Prose sources={["s1", "s2", "s3"]}>
            These projects belong beside one another, not in a simplistic parent-child chain. IBM’s 801 preceded the
            university prototypes, while Berkeley and Stanford pursued separate DARPA-sponsored programs. Their shared
            lesson was economic as much as aesthetic: spend transistors and design effort only where workloads and
            compilers can use them effectively.
          </Prose>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="border-t border-border-strong pt-5 text-h2 text-ink">
          4. The major branches: SPARC, MIPS, POWER, PowerPC, and Arm
        </h2>
        <div className="mt-5 space-y-6">
          <Prose sources={["s2", "s5"]}>
            <strong className="font-semibold text-ink">SPARC</strong> is the clearest commercial branch from Berkeley
            RISC. SPARC International records that a Sun Microsystems team, including Bill Joy, defined the architecture
            in 1984 largely from Patterson’s RISC specifications. SPARC became central to Sun workstations and servers,
            later growing into a 64-bit architecture.
          </Prose>
          <Prose sources={["s3", "s4"]}>
            <strong className="font-semibold text-ink">MIPS</strong> carried Stanford’s compiler-oriented project into
            commercial systems. Its clean register operations and explicit load/store style made the architecture easy
            to teach and practical to pipeline. MIPS spread through Unix workstations, embedded systems, networking
            equipment, and consumer electronics—even as the corporate ownership of the ISA changed repeatedly.
          </Prose>
          <Prose sources={["s1"]}>
            <strong className="font-semibold text-ink">POWER and PowerPC</strong> grew from IBM’s RISC program. IBM’s
            RS/6000 arrived in 1990 as the first system in the POWER line. IBM, Apple, and Motorola then formed the AIM
            alliance, introducing PowerPC in 1993. This branch powered workstations, servers, Macintosh systems, game
            consoles, and embedded products; today the lineage continues through the Power ISA and IBM Power systems.
          </Prose>
          <Prose sources={["s6"]}>
            <strong className="font-semibold text-ink">Arm</strong> emerged independently at Acorn Computers in the same
            broader RISC era. Sophie Wilson and Steve Furber led the processor effort, with first ARM1 silicon operating
            in 1985. Advanced RISC Machines was founded in November 1990 as a joint venture of Acorn, Apple, and VLSI
            Technology. Arm’s later licensing model let many companies build distinct processors and SoCs around a
            common architecture.
          </Prose>
          <Prose sources={["s5", "s6"]}>
            This is why drawing a single arrow labeled “Berkeley RISC → Arm” would be historically careless. SPARC has a
            documented design relationship to Berkeley RISC. Arm shares the era’s preference for a streamlined,
            compiler-friendly ISA, but its product line began inside Acorn. Similar design principles do not imply source
            compatibility, binary compatibility, or corporate descent.
          </Prose>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="border-t border-border-strong pt-5 text-h2 text-ink">
          5. Why modern RISC and CISC no longer look like simple opposites
        </h2>
        <div className="mt-5 space-y-6">
          <Prose sources={["s11", "s12"]}>
            The original debate focused on the complexity visible in the instruction set and the hardware cost of
            executing it. Modern high-performance processors add another layer. A contemporary x86 front end can decode
            variable-length architectural instructions into smaller internal operations, then feed register renaming,
            out-of-order scheduling, speculative execution, and multiple execution units. Those internal operations are
            an implementation detail; software still observes x86 semantics.
          </Prose>
          <TextDiagram caption="A simplified contemporary superscalar pipeline">
{`architectural instruction stream
              │
              ▼
       fetch + prediction
              │
              ▼
     decode into internal ops
              │
              ▼
       register renaming
              │
              ▼
    out-of-order scheduling
        ┌─────┼─────┬────────┐
        ▼     ▼     ▼        ▼
       ALU   vector load/store branch
        └─────┴─────┴────────┘
              │
              ▼
      retire in program order`}
          </TextDiagram>
          <Prose sources={["s11", "s12"]}>
            RISC implementations can use the same broad techniques. The RISC-V specification explicitly avoids tying
            the ISA to an in-order, out-of-order, microcoded, or other particular microarchitecture. A simple
            microcontroller core and a wide out-of-order application processor can therefore implement the same base
            ISA at very different cost and performance points.
          </Prose>
          <Prose sources={["s11", "s12"]}>
            The useful modern distinction is not “RISC chips are simple while CISC chips are complex.” It is that the
            ISAs expose different historical contracts, encoding choices, extension models, and compatibility burdens.
            Actual performance depends on workload, compiler quality, cache and memory behavior, vector facilities,
            process technology, power limits, and the microarchitecture implementing the ISA.
          </Prose>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="border-t border-border-strong pt-5 text-h2 text-ink">
          6. RISC-V: Berkeley returns with an open, clean-slate ISA
        </h2>
        <div className="mt-5 space-y-6">
          <Prose sources={["s9", "s10"]}>
            RISC-V began at UC Berkeley in May 2010, led initially by Krste Asanović with graduate students Yunsup Lee
            and Andrew Waterman, in the Parallel Computing Laboratory directed by David Patterson. The “V” recognizes
            the line of earlier Berkeley RISC projects, but RISC-V is not binary-compatible with RISC I, SPARC, MIPS, Arm,
            or any other historical ISA.
          </Prose>
          <Prose sources={["s9", "s11"]}>
            Its defining difference is openness. The ISA is published as an open standard, with a small base integer ISA
            and optional standard extensions. An implementation can be a tiny embedded core, a Linux-capable application
            processor, or a control processor embedded inside an accelerator. Vendors may build open or proprietary
            microarchitectures without changing the standard software-visible contract.
          </Prose>
          <Prose sources={["s11"]}>
            That modularity is also a systems challenge. “RISC-V” alone does not tell an operating system every feature a
            processor has; software must reason about base widths, ratified extensions, privilege architecture, platform
            firmware, interrupt controllers, and profiles. Openness removes the need to license the ISA, but it does not
            remove the hard work of building a coherent hardware and software platform.
          </Prose>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="border-t border-border-strong pt-5 text-h2 text-ink">
          7. The genealogy becomes concrete inside Linux
        </h2>
        <div className="mt-5 space-y-6">
          <Prose sources={["s13", "s14"]}>
            Linux shares schedulers, filesystems, networking, memory-management abstractions, and driver frameworks
            across platforms. But the kernel source still needs an architecture boundary. The top-level
            <InlineCode>arch/</InlineCode> directory contains ports such as <InlineCode>arch/x86/</InlineCode>,
            <InlineCode>arch/arm64/</InlineCode>, <InlineCode>arch/riscv/</InlineCode>,
            <InlineCode>arch/powerpc/</InlineCode>, <InlineCode>arch/mips/</InlineCode>, and
            <InlineCode>arch/sparc/</InlineCode>. Common architecture configuration even delegates to
            <InlineCode>arch/$(SRCARCH)/Kconfig</InlineCode>.
          </Prose>
          <Prose sources={["s13", "s14"]}>
            That code translates Linux concepts into each ISA and platform’s mechanisms. Early boot must enter with the
            right processor state. Page-table code must construct hardware-specific entries and flush the correct TLBs.
            Exception and system-call entry code must save the right registers. Atomics and memory barriers must satisfy
            both the kernel memory model and the architecture’s ordering rules. Context switching must preserve every
            state component the ABI exposes.
          </Prose>
          <TextDiagram caption="Where to begin reading a Linux architecture port">
{`arch/<architecture>/
├── Kconfig + Makefile       build and feature selection
├── kernel/                  boot, traps, SMP, process state
├── entry/                   exceptions and system calls
├── mm/                      page tables, TLBs, memory layout
├── include/asm/             architecture-facing kernel API
└── lib/                     optimized architecture helpers

Then cross-check:
Documentation/arch/<architecture>/`}
          </TextDiagram>
          <Prose sources={["s13"]}>
            Porting Linux to a new ISA is therefore not just recompiling C with another target triple. It requires an ABI,
            toolchain, boot environment, timer and interrupt model, virtual-memory implementation, synchronization
            primitives, device discovery, and enough platform standardization for drivers and user space to agree on the
            machine they are running on.
          </Prose>
        </div>
      </section>

      <section className="mt-12 border-y border-border py-6">
        <SectionMarker label="The practical mental model" />
        <ol className="mt-5 space-y-5">
          {[
            <>
              <strong className="font-semibold text-ink">Treat ISA as a contract, not a performance score.</strong>{" "}
              x86-64, AArch64, and RV64 describe software-visible behavior; benchmarks measure particular systems.
            </>,
            <>
              <strong className="font-semibold text-ink">Read the genealogy as influence plus compatibility.</strong>{" "}
              x86 is unusually defined by continuity; SPARC closely reflects Berkeley RISC; Arm is an independent RISC-era
              branch; RISC-V consciously starts a new open contract.
            </>,
            <>
              <strong className="font-semibold text-ink">Look inside Linux to see what the ISA changes.</strong>{" "}
              Boot, entry, page tables, barriers, atomics, and feature discovery expose the architectural differences
              hidden by portable user-space APIs.
            </>,
            <>
              <strong className="font-semibold text-ink">Do not stop at RISC versus CISC.</strong>{" "}
              Modern performance is primarily a question of microarchitecture, memory systems, accelerators, software,
              and power—not the historical label alone.
            </>,
          ].map((item, index) => (
            <li key={index} className="grid grid-cols-[1.75rem_1fr] gap-3">
              <span className="font-mono text-meta text-ink-faint">
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className="text-body-lg leading-8 text-ink-secondary">{item}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12">
        <h2 className="border-t border-border-strong pt-5 text-h2 text-ink">
          Conclusion: history explains the constraints, not the winner
        </h2>
        <div className="mt-5 space-y-6">
          <Prose sources={["s7", "s8", "s9", "s11"]}>
            x86 became the architecture of compatibility, Arm turned a licensable RISC architecture into a broad SoC
            ecosystem, and RISC-V made the ISA itself an open standard. IBM, Berkeley, Stanford, Sun, Acorn, Intel, and
            AMD all contributed different answers to the same enduring question: where should complexity live—inside
            instructions, compilers, processor implementations, or the surrounding platform?
          </Prose>
          <Prose sources={["s12", "s13"]}>
            For a kernel engineer, the answer is never purely academic. Architectural history survives as boot code,
            memory-ordering rules, ABI promises, compatibility paths, mitigations, and directories under
            <InlineCode>arch/</InlineCode>. Understanding the lineage makes those differences easier to reason about
            without reducing today’s processors to a forty-year-old slogan.
          </Prose>
          <p className="border-l-2 border-info bg-info-soft px-5 py-4 text-body-lg leading-8 text-ink-secondary">
            <strong className="font-semibold text-ink">Next in the series:</strong> Beyond the CPU—how GPUs, DSPs, ISPs,
            and NPUs turned modern SoCs into heterogeneous computers.
          </p>
        </div>
      </section>

      <section className="mt-12">
        <SectionMarker label="Primary sources" />
        <ol className="mt-4 space-y-3">
          {SOURCES.map((source) => (
            <li
              key={source.id}
              className="grid grid-cols-[2rem_1fr] gap-3 border-t border-border pt-3 text-small"
            >
              <span className="font-mono text-ink-faint">[{source.id.slice(1)}]</span>
              <span>
                <span className="text-ink">{source.title}</span>
                <span className="mt-0.5 block font-mono text-meta text-ink-muted">
                  {source.publisher} · {source.year}
                </span>
                <span className="mt-1 block text-ink-secondary">{source.note}</span>
                <SourceLink href={source.url}>Open primary source</SourceLink>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}
