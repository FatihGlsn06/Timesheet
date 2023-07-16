public with sharing class timeSheetEntryController 
{
   
    @AuraEnabled(cacheable=true)
    public static List<option> getProjects()
    {
        try {
            List<option> projectOptions = new List<option>();
            for(project__c pro: [Select id,name, project_ID__c from project__c])
            {
                option newop = new option();
                newop.label= pro.name ; //+ '-' + pro.id ;
                //newop.value= pro.project_ID__c;
                newop.value= pro.id;
                projectOptions.add( newop);
            }
            return projectOptions;
        } 
        catch (Exception e) 
        {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static String getProject(string ProjName)
    //public static String getProject()
    {
        try {
            
            //List<project__c> proj = [Select id,name, project_ID__c from project__c where name = :ProjName LIMIT 1];
            //List<project__c> proj = [Select id,name, project_ID__c from project__c where name ='Test Project' LIMIT 1];
            
            //string ap = proj[0].id ;
            
            string ap = ProjName;
            return ap;
        } 
        catch (Exception e) 
        {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static string insertTimesheets(List<string> listOfLines, string startDate, boolean sumitforApproval)
    {
        try {
            Map<string,integer> keyVsHours = new Map<string,integer>();
            List<Timesheet_Line_Items__c> lineList = new List<Timesheet_Line_Items__c>();
            date startdate1 = Date.parse(startDate);
            date enddate = Date.parse(startDate).addDays(6);
            timesheet__c sheet = new timesheet__c();
            sheet.user__c = userinfo.getuserid();
            sheet.Start_Date__c = startdate1;
            sheet.Status__c = sumitforApproval? 'SUBMITTED':'Draft';
            sheet.End_Date__c = enddate;
            insert sheet;
            for(string each: listOfLines)
            {
                List<string> temp = each.split('-');
                string key = temp[0]+'-'+temp[1];
                if(keyVsHours.containskey(key))
                {
                   integer add =  keyVsHours.get(key) + Integer.valueof(temp[2]);
                   keyVsHours.put(key,add);
                }
                else
                {
                    keyVsHours.put(key,Integer.valueof(temp[2]));
                }
            }
            for(string each: keyVsHours.keySet())
            {
                Timesheet_Line_Items__c line = new Timesheet_Line_Items__c();
                list<string> temp =  each.split('-');
                system.debug('temp@@ '+each+ temp);
                line.Entry_Date__c = date.parse(temp[1]);
                line.Timesheet__c = sheet.id;
                line.Hours__c = Integer.valueof(keyVsHours.get(each));
                lineList.add(line);
            }
            insert lineList;

            if(sumitforApproval)
            {
                Approval.ProcessSubmitRequest req1 = new Approval.ProcessSubmitRequest();
                req1.setComments('Submitting request for approval.');
                req1.setObjectId(sheet.id);
                req1.setSubmitterId(userinfo.getuserid());                 
                // Submit the approval request for the account
                Approval.ProcessResult result = Approval.process(req1);
            }
            return sheet.id;
        } 
        catch (Exception e) 
        {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<Timesheet_Line_Items__c> getTimesheetItems()
    {
        try 
        {
            List<Timesheet_Line_Items__c> lineList = new List<Timesheet_Line_Items__c>();
            
            for(Timesheet_Line_Items__c item: [Select Name,Hours__c,Entry_Date__c, Timesheet__c from Timesheet_Line_Items__c])
            {
                Timesheet_Line_Items__c line = new Timesheet_Line_Items__c();
                line.Entry_Date__c = item.Entry_Date__c;
                line.Timesheet__c = item.Timesheet__c;
                line.Hours__c = item.Hours__c;
                lineList.add(line);
            }
            return lineList;
        } 
        catch (Exception e) 
        {
            throw new AuraHandledException(e.getMessage());
        }
    }

/*    public static List<Timesheet__c> getTimesheets()
    {
        try 
        {
            List<Timesheet__c> tsList = new List<Timesheet__c>();
            List<Timesheet__c> line = new List<Timesheet__c>();
            for(Timesheet__c iteme: [Select Name,Hours__c,Entry_Date__c, Timesheet__c from Timesheet__c])
            {
                line.Entry_Date__c = iteme.Entry_Date__c;
                line.Timesheet__c = iteme.Timesheet__c;
                line.Hours__c = iteme.Hours__c;
                tsList.add(line);
            }
            return tsList;
        } 
        catch (Exception e) 
        {
            throw new AuraHandledException(e.getMessage());
        }
    }
*/
    public class option
    {
        @auraEnabled public string label{get;set;}
        @auraEnabled public string value{get;set;}
        @auraEnabled public string ID{get;set;}
    }
}