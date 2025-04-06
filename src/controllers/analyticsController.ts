import { Request, Response } from 'express';
import Course from '../models/Course';
import { Enrollment } from '../models/Enrollment';

export const getCreatorDashboardAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const creatorId = req.user?._id;
    const userRole = req.user?.role;

    if (!creatorId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    if (userRole !== 'creator') {
      res.status(403).json({ message: 'Only creators can access analytics' });
      return;
    }

    // Get all courses by the creator
    const courses = await Course.find({ creator: creatorId });

    // Get all enrollments for the creator's courses
    const courseIds = courses.map(course => course._id);
    const enrollments = await Enrollment.find({ course: { $in: courseIds } });

    // Calculate total students (unique students across all courses)
    const uniqueStudents = new Set(enrollments.map((e: any) => e.user.toString()));
    const totalStudents = uniqueStudents.size;

    // Calculate total revenue
    const totalRevenue = enrollments.reduce((sum: number, enrollment: any) => {
      const course = courses.find(c => c._id.toString() === enrollment.course.toString());
      return sum + (course?.price || 0);
    }, 0);

    // Calculate completion rate
    const completedEnrollments = enrollments.filter((e: any) => e.status === 'completed');
    const completionRate = enrollments.length > 0 
      ? Math.round((completedEnrollments.length / enrollments.length) * 100)
      : 0;

    // Get recent activity (last 5 courses with their stats)
    const recentCourses = await Course.find({ creator: creatorId })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate('creator', 'name');

    const recentActivity = await Promise.all(recentCourses.map(async course => {
      const courseEnrollments = await Enrollment.find({ course: course._id });
      const revenue = courseEnrollments.length * (course.price || 0);
      
      return {
        _id: course._id,
        title: course.title,
        enrolledStudents: courseEnrollments.length,
        revenue
      };
    }));

    res.json({
      success: true,
      data: {
        totalStudents,
        totalCourses: courses.length,
        totalRevenue,
        completionRate: `${completionRate}%`,
        recentActivity
      }
    });
  } catch (error) {
    console.error('Error getting dashboard analytics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching dashboard analytics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getDetailedAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const creatorId = req.user?._id;
    const userRole = req.user?.role;

    if (!creatorId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    if (userRole !== 'creator') {
      res.status(403).json({ message: 'Only creators can access analytics' });
      return;
    }

    // Get all courses by the creator
    const courses = await Course.find({ creator: creatorId });
    const courseIds = courses.map(course => course._id);

    // Get all enrollments for the creator's courses
    const enrollments = await Enrollment.find({ 
      course: { $in: courseIds }
    }).populate('course', 'title price');

    // Calculate course performance
    const coursePerformance = await Promise.all(courses.map(async course => {
      const courseEnrollments = enrollments.filter(e => e.course._id.toString() === course._id.toString());
      const completedCount = courseEnrollments.filter(e => e.status === 'completed').length;
      const revenue = courseEnrollments.length * (course.price || 0);
      
      return {
        courseId: course._id,
        title: course.title,
        totalEnrollments: courseEnrollments.length,
        completionRate: courseEnrollments.length > 0 
          ? Math.round((completedCount / courseEnrollments.length) * 100)
          : 0,
        revenue
      };
    }));

    // Calculate monthly revenue growth (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const recentEnrollments = enrollments.filter(e => 
      new Date(e.createdAt) >= sixMonthsAgo
    );

    const monthlyRevenue = Array.from({ length: 6 }, (_, i) => {
      const month = new Date();
      month.setMonth(month.getMonth() - i);
      const monthEnrollments = recentEnrollments.filter(e => {
        const enrollmentDate = new Date(e.createdAt);
        return enrollmentDate.getMonth() === month.getMonth() &&
               enrollmentDate.getFullYear() === month.getFullYear();
      });
      
      return {
        month: month.toLocaleString('default', { month: 'short' }),
        revenue: monthEnrollments.reduce((sum, e) => {
          const course = e.course as any;
          return sum + (course?.price || 0);
        }, 0)
      };
    }).reverse();

    // Calculate student engagement
    const totalEnrollments = enrollments.length;
    const completedEnrollments = enrollments.filter(e => e.status === 'completed').length;
    const studentEngagement = {
      totalStudents: new Set(enrollments.map(e => e.user.toString())).size,
      activeStudents: new Set(
        enrollments
          .filter(e => e.status === 'active')
          .map(e => e.user.toString())
      ).size,
      completionRate: totalEnrollments > 0
        ? Math.round((completedEnrollments / totalEnrollments) * 100)
        : 0
    };

    res.json({
      success: true,
      data: {
        coursePerformance,
        monthlyRevenue,
        studentEngagement
      }
    });
  } catch (error) {
    console.error('Error getting detailed analytics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching detailed analytics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 