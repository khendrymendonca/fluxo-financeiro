import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFinanceStore } from '@/hooks/useFinanceStore';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DayPicker } from 'react-day-picker';
import { cn } from '@/lib/utils';

export function MonthSelector() {
    const {
        viewDate,
        setViewDate,
        viewMode,
        setViewMode,
        nextMonth,
        prevMonth,
        nextDay,
        prevDay,
        nextYear,
        prevYear
    } = useFinanceStore();

    const handlePrev = () => {
        if (viewMode === 'day') prevDay();
        else if (viewMode === 'month') prevMonth();
        else prevYear();
    };

    const handleNext = () => {
        if (viewMode === 'day') nextDay();
        else if (viewMode === 'month') nextMonth();
        else nextYear();
    };

    const getFormat = () => {
        if (viewMode === 'day') return "dd 'de' MMMM yyyy";
        if (viewMode === 'month') return 'MMMM yyyy';
        return 'yyyy';
    };

    return (
        <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Mode Selector */}
            <div className="flex p-1 bg-muted rounded-xl">
                {(['day', 'month', 'year', 'all'] as const).map((mode) => (
                    <Button
                        key={mode}
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewMode(mode)}
                        className={cn(
                            "h-7 px-3 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all",
                            viewMode === mode ? "bg-background shadow-sm text-primary" : "text-muted-foreground"
                        )}
                    >
                        {mode === 'day' ? 'Dia' : mode === 'month' ? 'Mês' : mode === 'year' ? 'Ano' : 'Tudo'}
                    </Button>
                ))}
            </div>

            {/* Date Navigator */}
            {viewMode === 'all' ? (
                <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-xl border border-primary/20 animate-fade-in h-10">
                    <Calendar className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Visualizando Todo o Período</span>
                </div>
            ) : (
                <div className="flex items-center gap-2 bg-card p-1 rounded-xl shadow-sm border border-border">
                    <Button variant="ghost" size="icon" onClick={handlePrev} className="h-8 w-8 rounded-lg">
                        <ChevronLeft className="w-4 h-4" />
                    </Button>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" className="h-8 min-w-[140px] font-medium capitalize rounded-lg">
                                <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                                {format(viewDate, getFormat(), { locale: ptBR })}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-50 rounded-2xl shadow-xl" align="center">
                            <CalendarPicker
                                mode="single"
                                selected={viewDate}
                                onSelect={(date: Date | undefined) => date && setViewDate(date)}
                                initialFocus
                                locale={ptBR}
                                className="p-3"
                                classNames={{
                                    day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground"
                                }}
                            />
                        </PopoverContent>
                    </Popover>

                    <Button variant="ghost" size="icon" onClick={handleNext} className="h-8 w-8 rounded-lg">
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}

// Wrapper for DayPicker with styles matching Shadcn UI roughly
function CalendarPicker({ className, classNames, showOutsideDays = true, ...props }: any) {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn("p-3", className)}
            classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                month: "space-y-4",
                caption: "flex justify-center pt-1 relative items-center",
                caption_label: "text-sm font-medium",
                nav: "space-x-1 flex items-center",
                nav_button: cn("h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"),
                nav_button_previous: "absolute left-1",
                nav_button_next: "absolute right-1",
                table: "w-full border-collapse space-y-1",
                head_row: "flex",
                head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                row: "flex w-full mt-2",
                cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                day: cn("h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-md hover:bg-accent hover:text-accent-foreground"),
                day_range_end: "day-range-end",
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                day_today: "bg-accent text-accent-foreground",
                day_outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                day_disabled: "text-muted-foreground opacity-50",
                day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                day_hidden: "invisible",
                ...classNames,
            }}
            {...props}
        />
    );
}


