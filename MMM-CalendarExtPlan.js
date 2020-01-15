/* Magic Mirror
* Module: MMM-CalendarExtPlan
*
* By eouia
*/

Module.register("MMM-CalendarExtPlan",{
  defaults: {
    maxItems: 100,
    refreshInterval: 60*60*1000, // millisec.
    dateFormat: "MMM D.",
    eventTimeFormat: "HH:mm",
    dayCount: 5,
    fromNow: 0,
    criteria: [],
    source: "CALEXT2", // or "CALEXT"
  },

  getStyles: function() {
    return ["MMM-CalendarExtPlan.css"]
  },

  getScripts: function () {
    return ["moment.js"];
  },

  start: function() {
    this.events = null
  },

  getDom: function() {
    var dom = document.createElement("div")
    dom.className = "CXP"
    var table = document.createElement("table")
    table.className = "CellTable"
    var cg = document.createElement("colgroup")
    cg.className = "tColGroup"
    cg = this.makeTColGroup(cg)
    table.appendChild(cg)
    var thead = document.createElement("tr")
    thead.className = "tHead"
    thead = this.makeTHeader(thead)
    table.appendChild(thead)
    this.makeTBody(table)
    dom.appendChild(table)
    return dom
  },

  makeTHeader: function(head) {
    var the = document.createElement("th")
    head.appendChild(the)
    for (i = 0; i < this.config.criteria.length; i++) {
      var cr = this.config.criteria[i]
      var th = document.createElement("th")
      th.innerHTML = (cr.title) ? cr.title : ""
      th.className = cr.className
      head.appendChild(th)
    }
    return head
  },

  makeTColGroup: function(cg) {
    var cgh = document.createElement("col")
    cgh.className = "headerWidth"
    cg.appendChild(cgh)
    for (i = 0; i < this.config.criteria.length; i++) {
      var cr = this.config.criteria[i]
      var th = document.createElement("col")
      cg.appendChild(th)
    }
    return cg
  },

  makeTBody: function(table) {
    if (!this.slots) return table
    if (this.slots.length <= 0) return table
    for (i = 0; i < this.slots.length; i++) {
      var slot = this.slots[i]
      var day = moment.unix(slot.startX)
      var dayEnd = moment(day).endOf("day")
      var isToday = (moment().format("YYYYMMDD") == day.format("YYYYMMDD"))
      var tr = document.createElement("tr")
      tr.classList.add("dIndex_" + i)
      tr.classList.add("year_" + day.format("YYYY"))
      tr.classList.add("month_" + day.format("M"))
      tr.classList.add("day_" + day.format("D"))
      tr.classList.add("week_" + day.format("W"))
      tr.classList.add("weekday_" + day.format("E"))
      tr.classList.add("eventCount_" + slot.events.length)
      if (isToday) tr.classList.add("today")
      var th = document.createElement("th")
      th.innerHTML = day.format(this.config.dateFormat)
      th.className = "day"
      tr.appendChild(th)
      for (j = 0; j < this.config.criteria.length; j++) {
        var cr = this.config.criteria[j]
        var td = document.createElement("td")
        td.classList.add(cr.className)
        td.classList.add("cIndex_" + j)
        var dv = document.createElement("div")
        dv.className = "wrapper"
        var events = slot.events.filter((ev)=>{
          if (cr.calendars.length == 0 || cr.calendars.includes(ev.calendarName)) {
            if (typeof cr.filter == "function") {
              return cr.filter(ev)
            } else {
              return true
            }
          } else {
            return false
          }
        })
        for (k = 0; k < events.length; k++) {
          var ev = events[k]
          var event = document.createElement("div")
          event.classList.add("event")
          if (ev.icon) {
            var icon = document.createElement("span")
            icon.className = "iconify eventIcon"
            icon.dataset.icon = ev.icon
            event.appendChild(icon)
          }
          var time = document.createElement("div")
          time.className = "eventTime"
          var es = moment.unix(ev.startDate)
          var ee = moment.unix(ev.endDate)
          if (ev.isFullday) time.classList.add("fullday")
          var start = document.createElement("div")
          start.className = "start"
          start.innerHTML = (ev.isFullday)
            ? ""
            : es.format(this.config.eventTimeFormat)
          if (day.isSameOrBefore(es) && dayEnd.isSameOrAfter(es)) {
            start.classList.add("startHere")
          }
          time.appendChild(start)
          var end = document.createElement("div")
          end.className = "end"
          end.innerHTML = (ev.isFullday)
            ? ""
            : ee.format(this.config.eventTimeFormat)
          if (day.isSameOrBefore(ee) && dayEnd.isSameOrAfter(ee)) {
            end.classList.add("endHere")
          }
          time.appendChild(end)
          event.appendChild(time)
          var title = document.createElement("div")
          title.className = "eventTitle"
          title.innerHTML = ev.title
          event.appendChild(title)
          dv.appendChild(event)
        }
        td.appendChild(dv)
        tr.appendChild(td)
      }
      table.appendChild(tr)
    }
    return table
  },


  refreshScreen: function() {
    clearTimeout(this.refreshTimer)
    this.refreshTimer = null
    this.updateDom()
    this.refreshTimer = setTimeout(()=>{
      this.refreshScreen()
    }, this.config.refreshInterval)
  },

  notificationReceived: function(notification, payload, sender) {
    if (notification == "DOM_OBJECTS_CREATED") {
      this.refreshScreen()
    }
    if (notification == "CALEXT_SAYS_CALENDAR_MODIFIED") {
      setTimeout(() => {
        this.updateRequest()
      }, 1000)
    }
    if (notification == "CALEXT_SAYS_SCHEDULE") {
      this.updateContent(this.convertEXT2(payload))
    }
    if (notification == "CALEXT2_CALENDAR_MODIFIED") {
      setTimeout(() => {
        this.updateRequest2()
      }, 1000)
    }
  },
  convertEXT2: function(payload) {
    if (payload.events.length <= 0) return payload
    for (i = 0; i < payload.events.length; i++) {
      var ev = payload.events[i]
      ev.startDate = ev.startDate / 1000
      ev.endDate = ev.endDate / 1000
      ev.calendarName = ev.name
      ev.className = ev.styleName
      ev.isFullday = (ev.fullDayEvent > 0)
    }
    return payload
  },

  updateContent: function(payload=null) {
    events = []
    if (payload != null) {
      if(payload.message == "SCHEDULE_FOUND") {
        events = payload.events
        events.sort((a, b)=>{
          if (a.startDate == b.startDate) {
            return a.endDate - b.endDate
          } else {
            return a.startDate - b.startDate
          }
        })
      }
      this.slots = this.makeSlot(
        {
          fromNow: this.config.fromNow,
          dayCount: this.config.dayCount
        },
        events
      )
      this.refreshScreen()
    }
  },

  makeSlot: function (duration, events=[]) {
    var slots = []
    for(i = 0; i < duration.dayCount; i++) {
      var startX = moment().add(duration.fromNow, "day").add(i, "day").startOf("day").format("X")
      var endX = moment.unix(startX).endOf("day").format("X")
      var daySlot = {
        dIndex: i,
        startX: startX,
        endX: endX,
        events: [],
      }
      slots.push(daySlot)
    }
    for (i = 0; i < events.length; i++) {
      var ev = events[i]
      for (j = 0; j < slots.length; j++) {
        var ds = slots[j]
        var es = ev.startDate
        var ee = ev.endDate
        if ((es > ds.endX) || (ee <= ds.startX)) {
          //invalid
        } else {
          ds.events.push(ev)
        }
      }
    }
    return slots
  },

  updateRequest: function() {
    var from = moment().add(this.config.fromNow, "d").startOf("day").format("x")
    var to = moment(from).add(this.config.dayCount, "d").endOf("day").format("x")
    var filter = {
      names: this.names,
      from: from,
      to: to,
      count: this.config.maxItems
    }
    var payload = {
      filter: filter,
      sessionId: moment().format('X')
    }
    this.sendNotification("CALEXT_TELL_SCHEDULE", payload)
  },

  updateRequest2: function() {
    var payload = {
      filter: (e) => {
        var from = moment().add(this.config.fromNow, "d").startOf("day").format("X")
        var to = moment.unix(from).add(this.config.dayCount, "d").endOf("day").format("X")
        if (e.startDate > to || e.endDate < from) {
          return false
        }
        return true
      },
      callback: (events) => {
        if (events.length > 0) {
          for (i = 0; i < events.length; i++) {
            //events[i].name = events[i].calendarName
            events[i].startDate = events[i].startDate
            events[i].endDate = events[i].endDate
            events[i].styleName = events[i].className
          }
          var payload = {
            message: "SCHEDULE_FOUND",
            events: events
          }
          this.updateContent(payload)
        }
      }
    }
    this.sendNotification("CALEXT2_EVENT_QUERY", payload)
  },

  getWholeCalendars: function(crit = []) {
    var calendars = []
    for ( i=0; i < crit.length; i++) {
      var cr = crit[i]
      var cal = (cr.hasOwnProperty("calendars")) ? cr.calendars : []
      calendars = calendars.concat(cal)
    }
    return calendars
  }

})
