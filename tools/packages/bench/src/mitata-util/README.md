# MitataBench

**`mitataBench()`** enhances the use of the `mitata` benchmarking library, 
expecially for longer benchmark tests.

## Features
**gc reporting** - 
**`mitataBench()`** optionally uses node `perf_hooks` 
to track garbage collection time during the benchmark run. 
  - mitata has a facility to track the time for injected gc() calls between
    tests, but this fails to capture collections internal to 
    benchmark test runs.

**configuration** - 
**`mitataBench()`** exposes useful configuration options like `min_cpu_time`.  
  - some more configuration options are available internally in `mitata`,
    but they're hard to use externally because of the undocumented setup required
    for garbage collection and cpu counters.

**cpu counters on demand** - 
**`mitataBench()`** loads @mitata/counters on demand rather than statically.
  - @mitata/counters initializes on load. 
    It takes a couple of seconds to initialize, which is unnecessary
    in profile or compile time validation runs that don't track cpu counters.

**convenient conversions** -
**`mitataBench()`** converts collected measurements to convenient units
(milliseconds and kilobytes)

**a bit more documentation** -
**`mitataBench()`** includes some notes on the collected measurements.