"use client";

import { CourseDataResponse } from "@skillhub/types/course";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface CourseCardProps {
  course: CourseDataResponse;
  onSelect?: (course: CourseDataResponse) => void;
  selected?: boolean;
}

export function CourseCard({ course, onSelect, selected }: CourseCardProps) {
  return (
    <Card className={`w-full ${selected ? "border-primary" : ""}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{course.name}</CardTitle>
            <CardDescription className="text-sm mt-1">
              Code: {course.code}
            </CardDescription>
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            {course.duration} months
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {course.description && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {course.description}
          </p>
        )}
        {course.eligibility && (
          <div className="mt-2">
            <p className="text-xs font-medium">Eligibility:</p>
            <p className="text-xs text-muted-foreground">{course.eligibility}</p>
          </div>
        )}
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold">₹{course.fees}</p>
            <p className="text-xs text-muted-foreground">Fees</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">{course.seats}</p>
            <p className="text-xs text-muted-foreground">Seats available</p>
          </div>
        </div>
      </CardContent>
      {onSelect && (
        <CardFooter>
          <Button
            onClick={() => onSelect(course)}
            className="w-full"
            variant={selected ? "default" : "outline"}
          >
            {selected ? "Selected" : "Select Course"}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}