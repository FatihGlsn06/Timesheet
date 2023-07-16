import { LightningElement,wire,track } from 'lwc';
import Id from '@salesforce/user/Id';
import { NavigationMixin } from "lightning/navigation";
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getRecord } from 'lightning/uiRecordApi';
import getProjects from '@salesforce/apex/timeSheetEntryController.getProjects';
import getProject from '@salesforce/apex/timeSheetEntryController.getProject';
import insertTimesheets from '@salesforce/apex/timeSheetEntryController.insertTimesheets';
import GetTimeSheetItems from '@salesforce/apex/timeSheetEntryController.getTimesheetItems';

import UserNameFIELD from '@salesforce/schema/User.Name';
import UserIDFIELD from '@salesforce/schema/User.Id';

const DAYSARRAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYSARRAYFULL = [ 'Monday', 'Tueday', 'Wednesday', 'Thursday', 'Friday', 'Saturday','Sunday'];
export default class TimesheetEntryLWC extends NavigationMixin(LightningElement) {
    @track currentUserName;
    @track currentUserID;
    @track selectedProjectID;
    @track currentDate;
    @track dates = [];
    @track projectOptions;
    @track project;
    @track defaultProject;
    @track projectvsTimesheetLines=[];
    @track timesheetLines=[];
    @track daysVsTotalObj={};
    @track dayVsDateObj={};
    @track finaltimesheetVar=[];
    @track showSpinner;
    @wire(getRecord, { recordId: Id, fields: [UserNameFIELD,UserIDFIELD] }) 
    currentUserInfo({error, data}) {
        if (data) {
            this.currentUserName = data.fields.Name.value;
            this.currentUserID =  data.fields.Id.value;
        } else if (error) {
            this.error = error ;
        }
    }
    @wire(getProjects) projects({error,data}){
        if(data){
            this.projectOptions = data;
            //this.defaultProject = data[0].value; 
            this.defaultProject = data[0].ID;
            this.setDefaultLine();
        }
        if(error){
            console.log('error@@ ', error.body.message);
        }
    }

   
    //ProjName = this.defaultProject ;
    ProjName = this.defaultOptions ;
    //ProjName = 'Hello';
    @wire(getProject,{ProjName: '$ProjName'}) project({error,data}){
        //this.selectedProjectID = 'Testing';
        if(data){
            this.selectedProjectID = data ;
           
            //this.project = data[0].value; 
           //this.setDefaultLine();
        }
        if(error){
            console.log('error@@ ', error.body.message);
            
        }
    }

    @wire(GetTimeSheetItems) wiredItems({error,data}){
        if(data){
            this.TimesheetLines = data[0].value; 
        }
        if(error){
            console.log('error@@ ', error.body.message);
        }
    }

    setDefaultLine(){
        let uniNum = Math.floor(Date.now() / 1000);
        this.projectvsTimesheetLines.push( {index: uniNum, project:this.defaultProject, days:DAYSARRAYFULL});
    }
    connectedCallback(){
        this.dates= this.setdates(new Date());
        this.currentDate = new Date();
        this.setDaysTotal();
    }

    setDaysTotal(){
        DAYSARRAYFULL.forEach(each => {
            this.daysVsTotalObj[each] = 0;
        })
    }

    handleLineDelete(event){
        let searchIndex = event.target.dataset.index;
        this.projectvsTimesheetLines = this.projectvsTimesheetLines.filter( each =>{
            return searchIndex != each.index
        })
        this.timesheetLines = this.timesheetLines.filter( each =>{
            let search = each.split('-');
            return search[0] !=searchIndex            
        })
        this.updateDailyHours();
        // projectvsTimesheetLines
        // timesheetLines
        //updateDailyHours
    }

    handleCancel(){
        window.history.back();
    }

    handleProjectChange(event){
       // this.showSpinner = true;
       // if( this.validateTimeSheets()){
       //     this.showSpinner = false;
       //    return false;
       // }
       this.projectvsTimesheetLines[0].data = 99;
        this.selectedProjectID = event.target.value + "-99";
       
        //this.selectedProjectID = event.target.ID;
        //this.saveOrSumitTheSheet(true);
    }
    

    handleDateChange(event){
        this.dates=this.setdates(new Date(event.target.value));
        this.projectvsTimesheetLines = [];
        this.timesheetLines = [];
        this.setDefaultLine();
        this.setDaysTotal();
    }

    handleInsert(){
        this.showSpinner = true;
        if( this.validateTimeSheets()){
            this.showSpinner = false;
            return false;
         }
         this.saveOrSumitTheSheet(false);
    }

    handleSubmit(){
        this.showSpinner = true;
        if( this.validateTimeSheets()){
            this.showSpinner = false;
           return false;
        }
        this.saveOrSumitTheSheet(true);
    }

    validateTimeSheets(){
        if(this.timesheetLines.length ==0){
            this.showToast('Error','Please add weekly hours.');
            return true;
        }
        let indexProject = {};
        let projectList = this.template.querySelectorAll('lightning-combobox');
        projectList.forEach( each =>{
            console.log('each.dataset.index@ ',each.dataset.index);
            indexProject[each.dataset.index] = each.value;
        }) 
        this.finaltimesheetVar = [];
         this.timesheetLines.forEach( each =>{
            let temp = each.split('-');
            let day = temp[1];
            if(Object.keys(this.dayVsDateObj).includes(day)){
                each = each.replace(day,this.dayVsDateObj[day]);
                each = each.replace(temp[0], indexProject[temp[0]])
                this.finaltimesheetVar.push(each);
            }
        })
    }

    saveOrSumitTheSheet(submit){
        insertTimesheets({
            listOfLines: this.finaltimesheetVar,
            startDate: this.dayVsDateObj['Monday'],
            sumitforApproval : submit
        }).then( result =>{
            this.showToast('Success','Timesheet created!');
            console.log('result@@ ', result);
            this[NavigationMixin.Navigate]({
                type: 'standard__recordPage',
                attributes: {
                    recordId: result,
                    objectApiName: 'Timesheet__c',
                    actionName: 'view'
                }
            });
            this.showSpinner = false;
        })
        .catch( error =>{
            console.log('error.body.message', error.body.message);
            this.showSpinner = false;
            this.showToast('Error',error.body.message);
        })
    }

    get totalHoursOfWeek(){
        return Object.values(this.daysVsTotalObj).reduce( (acc,current) => acc + current,0);
    }

    get daysTotal(){
        return Object.entries(this.daysVsTotalObj).map(([key,value])=>({ key, value }));
    }

    setdates(current) {
        var week= new Array(); 
        // Starting Monday not Sunday
        current.setDate((current.getDate() - current.getDay() +1));
        for (var i = 0; i < 7; i++) {
            let now = current.toLocaleDateString('en-GB');
            let day = current.getDay();
            this.dayVsDateObj[[ 'Sunday','Monday', 'Tueday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day]] = now;
            week.push(
                now+' ('+DAYSARRAY[day]+')'
            ); 
            
            current.setDate(current.getDate() +1);
        }
        console.log('week@@ ', week);
        return week; 
    }

    handleHourChange(event){
        if(event.target.value == ''){
            return;
        }
        let searchkey =this.timesheetLines.find( each => {
                            let search = each.split('-');
                            if(search[1] == event.target.name && search[0] == event.target.dataset.index){
                                return each;
                            }
                        })
        if(this.timesheetLines.includes(searchkey)){
            let index = this.timesheetLines.indexOf(searchkey);
            if (index > -1) { // only splice array when item is found
                this.timesheetLines.splice(index, 1); // 2nd parameter means remove one item only
                console.log('this.timesheetLines@@231 ', this.timesheetLines);
            }
        }
        this.timesheetLines.push(event.target.dataset.index+'-'+event.target.name+'-'+event.target.value);
        this.updateDailyHours();
        console.log('this.timesheetLines@@ ', this.timesheetLines);
    }

    updateDailyHours(){
        this.setDaysTotal();
        console.log('this.daysVsTotalObj@@ ', this.daysVsTotalObj);
        this.timesheetLines.forEach( each =>{
            let arr = each.split('-');
                let addeder = arr[2] !=''? parseInt(arr[2]):0;
                this.daysVsTotalObj[arr[1]] = parseInt(this.daysVsTotalObj[arr[1]]) + addeder;            
        })
    }

    addNewLine(){
        let uniNum = Math.floor(Date.now() / 1000);
        this.projectvsTimesheetLines.push( {index: uniNum, project:this.defaultProject, days:DAYSARRAYFULL});
        console.log('this.projectvsTimesheetLines@ ', this.projectvsTimesheetLines);
    }
   
    showToast(variant,message) {
        const evt = new ShowToastEvent({
            title: variant,
            message: message,
            variant: variant,
        });
        this.dispatchEvent(evt);
    }

   
}