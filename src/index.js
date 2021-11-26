import { getLCP, getFID, getCLS } from 'web-vitals'

window.WARDEN_EXTRA_DATA = {}

Warden.addData = function (fn) {
  fn && fn(WARDEN_EXTRA_DATA)
};

if (typeof require === 'function' && typeof exports === 'object' && typeof module === 'object') {
  module.exports = Warden
} else {
  window.Warden = Warden
}

function Warden(opt, CB) {
  try {
    let OPTIONS = {
      domain: '',
      delay: 300,
      extra: {}
    }
    OPTIONS = Object.assign(OPTIONS, opt);
    const DATA = {
      performance: {},
      resourceInfo: [],
      prevUrl: document.referrer && document.referrer !== location.href ? document.referrer : '',
      pageUrl: '',
      system: '',
      LCP: '',
      FID: '',
      CLS: ''
    }

    let startTime = getCurrentTime()
    let loadTime = 0

    window.addEventListener('load', () => {
      loadTime = getCurrentTime() - startTime
      reportData(1)
    }, false)

    getLCP(data => {
      console.log(data)
      DATA.LCP = data
      reportData(3)
    })

    getFID(data => {
      DATA.FID = data
      reportData(3)
    })

    getCLS(data => {
      DATA.CLS = data
      reportData(3)
    })

    function getResourceInfo() {
      if (!window.performance || !window.performance.getEntries) return false
      const resourceList = performance.getEntriesByType('resource')
      let resourceInfo = []
      if (!resourceList || !resourceList.length) return resourceInfo
      resourceList.forEach(item => {
        const info = {
          name: item.name,
          method: 'GET',
          type: item.initiatorType,
          duration: item.duration.toFixed(2) || 0,
          decodedBodySize: item.decodedBodySize || 0,
          nextHopProtocol: item.nextHopProtocol
        }
        resourceInfo.push(info)
      })
      DATA.resourceInfo = resourceInfo
    }

    function getPerformance() {
      let timing = window.performance.timing;
      if (typeof window.PerformanceNavigationTiming === 'function') {
        try {
          var nt2Timing = performance.getEntriesByType('navigation')[0]
          if (nt2Timing) {
            timing = nt2Timing
          }
        } catch (err) {
        }
      }
      DATA.performance = {
        // 重定向时间
        redirect: timing.redirectEnd - timing.redirectStart || 0,
        // dns查询耗时
        dnsLoopUp: timing.domainLookupEnd - timing.domainLookupStart || 0,
        // TTFB 读取页面第一个字节的时间
        ttfb: timing.responseStart - timing.navigationStart || 0,
        // DNS 缓存时间
        dnsCache: timing.domainLookupStart - timing.fetchStart || 0,
        // 卸载页面的时间
        unload: timing.unloadEventEnd - timing.unloadEventStart || 0,
        // tcp连接耗时
        connect: timing.connectEnd - timing.connectStart || 0,
        // request请求耗时
        request: timing.responseEnd - timing.requestStart || 0,
        // 解析dom树耗时
        domTree: timing.domComplete - timing.domInteractive || 0,
        // 白屏时间
        blank: (timing.domInteractive || timing.domLoading) - timing.fetchStart || 0,
        // domReadyTime
        domReady: timing.domContentLoadedEventEnd - timing.fetchStart || 0
      }
    }

    function getSystem() {
      const ua = navigator.userAgent
      if (ua.indexOf('Android') > -1 || ua.indexOf('Adr') > -1) {
        DATA.system = 'Android'
      } else if (ua.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/)) {
        DATA.system = 'IOS'
      } else {
        DATA.system = 'PC'
      }
    }

    function reportData(type = 1) {
      setTimeout(() => {
        getPerformance()
        getResourceInfo()
        getSystem()
        let info = {
          time: new Date().getTime(),
          extraData: WARDEN_EXTRA_DATA,
          type,
          url: location.href
        }
        if (type === 1) {
          info = {
            ...info,
            prevUrl: DATA.prevUrl,
            performance: DATA.performance,
            resourceInfo: DATA.resourceInfo,
            system: DATA.system,
          }
        } else if (type === 3) {
          info = {
            ...info,
            LCP: DATA.LCP,
            FID: DATA.FID,
            CLS: DATA.CLS
          }
        }

        info = Object.assign(info, OPTIONS.add)
        CB && CB(info)
        if (!CB && window.fetch) {
          fetch(OPTIONS.domain, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            type: 'report-data',
            body: JSON.stringify(info)
          })
        }
      }, OPTIONS.delay)
    }

    function getCurrentTime() {
      return (window.performance && performance.now()) || new Date().getTime()
    }
  } catch (err) {
  }
}
