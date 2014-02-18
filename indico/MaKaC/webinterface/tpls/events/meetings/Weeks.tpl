<%namespace name="common" file="${context['INCLUDE']}/Common.tpl"/>

<%
    from collections import defaultdict, OrderedDict
    _firstDay = (parseDate(firstDay, format="%d-%B-%Y") if firstDay else startDate).date()
    _lastDay = (parseDate(lastDay, format="%d-%B-%Y") if lastDay else endDate).date()
    sundayFirst = _request.args.get('sundayFirst') == '1'


    def _processEntry(entry):
        """ Flatten the timetable into single entries"""
        itemType = getItemType(entry)
        startTime = entry.getAdjustedStartDate(timezone)
        if itemType == 'Contribution':
            yield 'contrib', startTime, entry
        elif itemType == 'Break':
            yield 'break', startTime, entry
        elif itemType == 'Session':
            for subEntry in entry.getSchedule().getEntries():
                if subEntry.__class__.__name__ != 'BreakTimeSchEntry':
                    subEntry = subEntry.getOwner()
                    if not subEntry.canView(accessWrapper):
                        continue
                for tmp in _processEntry(subEntry):
                    yield tmp


    def buildTable():
        allEntries = defaultdict(list)
        for entry in entries:
            entryDate = entry.getAdjustedStartDate(timezone).date()
            if _firstDay <= entryDate <= _lastDay:
                allEntries[entryDate] += _processEntry(entry)

        if not allEntries:
            return [], False

        hasWeekends = any(x.weekday() in (5, 6) for x in allEntries)

        sortedDates = sorted(allEntries.iterkeys())
        firstShownDay = sortedDates[0]
        lastShownDay = sortedDates[-1]
        weekStart = 6 if sundayFirst else 0
        if firstShownDay.weekday() != weekStart:
            firstShownDay -= timedelta(days=firstShownDay.weekday()) + timedelta(days=int(hasWeekends and sundayFirst))

        weekTableShallow = []
        for i, offset in enumerate(xrange((lastShownDay - firstShownDay).days + 1)):
            day = firstShownDay + timedelta(days=offset)
            if i % (7 if hasWeekends else 5) == 0:
                weekTableShallow.append([])
            weekTableShallow[-1].append((day, allEntries[day]))

        # build a new week table that contains placeholders
        weekTable = []
        for week in weekTableShallow:
            # Build list of time slots that are used this week
            slots = set()
            for day, dayEntries in week:
                slots.update(getTime(x[1]) for x in dayEntries)

            # Build each day with its contributions and placeholders
            tmp = []
            for day, dayEntries in week:
                dayTmp = defaultdict(list)
                for row in dayEntries:
                    startTime = row[1]
                    dayTmp[getTime(startTime)].append((row[0], row[2]))
                for slot in sorted(slots):
                    dayTmp.setdefault(slot, None)
                tmp.append((day, OrderedDict(sorted(dayTmp.items()))))

            weekTable.append(tmp)
        return weekTable, hasWeekends

    weekTable, hasWeekends = buildTable()
%>

<div class="event-info-header">
    <div>
        <div class="event-title">${conf.getTitle()}</div>
        ${common.renderEventTimeCompact(startDate, endDate)}
    </div>
</div>

<div class="week-timetable-wrapper">
    % for week in weekTable:
        <div class="clearfix week-timetable ${'no-weekends' if not hasWeekends else ''}">
            <ul>
                % for day, dayEntries in week:
                    <li>
                        <div class="row day-header">${prettyDate(day)}</div>
                        % for startTime, slotEntries in dayEntries.iteritems():
                            % if slotEntries is None:
                                <div class="row placeholder" data-slot="${startTime}"></div>
                            % else:
                                % for i, (entryType, entry) in enumerate(slotEntries):
                                    <%
                                        extraStyle = 'display: none; ' if i > 0 else ''
                                        if entryType == 'contrib' and entry.getSession():
                                            sessionName = entry.getSession().getTitle()
                                            sessionColor = entry.getSession().getColor()
                                    %>
                                    <div class="row ${entryType} ${'js-same-time' if i > 0 else ''}" style="${extraStyle}" data-slot="${startTime}">
                                        <span class="time">${startTime if i == 0 else ''}</span>
                                        <span>
                                            <span class="title">${entry.getTitle()}</span>
                                            % if entryType == 'contrib':
                                                % if entry.getSpeakerList() or entry.getSpeakerText():
                                                    - ${common.renderUsers(entry.getSpeakerList(), unformatted=entry.getSpeakerText(), title=False, spanClass='compact-speakers', italicAffilation=False, separator=' ')}
                                                % endif
                                            % endif
                                        </span>
                                        % if entryType == 'contrib' and entry.getSession():
                                            <i class="icon-circle-small session-mark" title="Session: ${sessionName}" style="color: ${sessionColor}"></i>
                                        % endif
                                        % if len(slotEntries) > 1 and i == 0:
                                            <i class="icon-info more-contribs" title="There are ${len(slotEntries)-1} more contributions at this time. Click this icon to show them."></i>
                                        % endif
                                    </div>
                                % endfor
                            % endif
                        % endfor
                    </li>
                % endfor
            </ul>
        </div>
    % endfor
</div>

<script>
    $('.more-contribs').css('cursor', 'pointer').on('click', function() {
        var row = $(this).closest('.row');
        var additional = row.nextAll('.js-same-time');
        additional.toggle();
        if (additional.is(':visible')) {
            $('.more-contribs').not(this).filter(function() {
                return !!$(this).closest('.row').next('.js-same-time:visible').length;
            }).trigger('click');
        }
        var sameSlotHeight = row.height() * (additional.filter(':visible').length + 1);
        row.closest('li').siblings('li').find('.row').filter(function() {
            return $(this).data('slot') == row.data('slot');
        }).height(sameSlotHeight);
    });
</script>
